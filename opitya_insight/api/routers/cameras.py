from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import cv2 # Import OpenCV for image processing
import os # Import os for path manipulation
from datetime import datetime # Import datetime

from ...database import models, database
from ..schemas import camera as camera_schema
from ...core.security import get_current_user
from ...core.worker_manager import _start_stream_worker_instance, _stop_stream_worker_instance, latest_camera_data # Import worker management and shared data from worker_manager
from ...database.database import SessionLocal # Import SessionLocal for worker initialization

router = APIRouter(
    prefix="/cameras",
    tags=["cameras"],
    dependencies=[Depends(get_current_user)],
    responses={404: {"description": "Not found"}},
)

# Define the globally accessible test stream URL
TEST_STREAM_URL = "rtsp://rtspstream:-S-8ZCvqgpHEbdhk7NMUW@zephyr.rtsp.stream/traffic"

# Define a directory for snapshots (ensure this path is correctly served by FastAPI)
SNAPSHOT_DIR = "static/snapshots"

@router.post("/", response_model=camera_schema.Camera)
def create_camera(camera: camera_schema.CameraCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Create a new camera for the current user.
    The TEST_STREAM_URL is a special case and can be used by all users.
    All other camera RTSP URLs must be unique across the system.
    """
    if camera.rtsp_url != TEST_STREAM_URL:
        # Check if a non-test camera with the same rtsp_url already exists
        existing_camera = db.query(models.Camera).filter(models.Camera.rtsp_url == camera.rtsp_url).first()
        if existing_camera:
            raise HTTPException(
                status_code=409,
                detail="This camera RTSP URL is already registered."
            )

    # If it's the test stream or a new unique URL, proceed to create it
    db_camera = models.Camera(**camera.dict(), owner_id=current_user.id, status="offline") # Default status to offline
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)

    # Start stream worker for the new camera if RTSP URL is provided
    if db_camera.rtsp_url:
        _start_stream_worker_instance(db_camera.id, db_camera.rtsp_url, database.SessionLocal, latest_camera_data)
        # Update camera status in DB to "online" if worker starts successfully
        db_camera.status = "online"
        db.add(db_camera)
        db.commit()
        db.refresh(db_camera)
        
    return db_camera

@router.put("/{camera_id}", response_model=camera_schema.Camera)
def update_camera(
    camera_id: int,
    camera_update: camera_schema.CameraCreate, # Reusing CameraCreate for simplicity
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update an existing camera for the current user.
    """
    db_camera = db.query(models.Camera).filter(
        models.Camera.id == camera_id,
        models.Camera.owner_id == current_user.id
    ).first()

    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")

    # Check for unique RTSP URL if it's being changed
    if camera_update.rtsp_url != TEST_STREAM_URL and camera_update.rtsp_url != db_camera.rtsp_url:
        existing_camera = db.query(models.Camera).filter(models.Camera.rtsp_url == camera_update.rtsp_url).first()
        if existing_camera:
            raise HTTPException(
                status_code=409,
                detail="This camera RTSP URL is already registered."
            )

    # Check if RTSP URL is being changed
    if camera_update.rtsp_url != db_camera.rtsp_url:
        # Stop existing worker if URL is changing
        _stop_stream_worker_instance(db_camera.id)
        db_camera.status = "offline" # Set to offline while changing/restarting

    for key, value in camera_update.dict(exclude_unset=True).items():
        setattr(db_camera, key, value)
    
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)

    # Start new worker if RTSP URL is provided and changed
    if db_camera.rtsp_url and camera_update.rtsp_url != db_camera.rtsp_url:
        _start_stream_worker_instance(db_camera.id, db_camera.rtsp_url, database.SessionLocal, latest_camera_data)
        db_camera.status = "online"
        db.add(db_camera)
        db.commit()
        db.refresh(db_camera)
    elif not db_camera.rtsp_url:
        # If RTSP URL is removed, ensure status is offline
        db_camera.status = "offline"
        db.add(db_camera)
        db.commit()
        db.refresh(db_camera)
        
    return db_camera


@router.get("/", response_model=List[camera_schema.Camera])
def read_cameras(skip: int = 0, limit: int = 10, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Retrieve a list of cameras owned by the current user.
    """
    cameras = db.query(models.Camera).filter(models.Camera.owner_id == current_user.id).offset(skip).limit(limit).all()
    return cameras

@router.get("/{camera_id}", response_model=camera_schema.Camera)
def read_camera(camera_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Retrieve a single camera by its ID, ensuring it belongs to the current user.
    """
    db_camera = db.query(models.Camera).filter(models.Camera.id == camera_id, models.Camera.owner_id == current_user.id).first()
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return db_camera

@router.delete("/{camera_id}", status_code=204)
def delete_camera(camera_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Delete a camera by its ID, ensuring it belongs to the current user.
    """
    db_camera = db.query(models.Camera).filter(models.Camera.id == camera_id, models.Camera.owner_id == current_user.id).first()
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # Stop the associated stream worker
    _stop_stream_worker_instance(camera_id)

    # Delete all associated PlateLog entries
    db.query(models.PlateLog).filter(models.PlateLog.camera_id == camera_id).delete()
    
    db.delete(db_camera)
    db.commit()
    return

@router.post("/{camera_id}/snapshot")
def capture_camera_snapshot(camera_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Capture a snapshot from a camera stream using the latest frame from the persistent worker.
    """
    db_camera = db.query(models.Camera).filter(models.Camera.id == camera_id, models.Camera.owner_id == current_user.id).first()
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # Get the latest frame from the shared data
    camera_data = latest_camera_data.get(camera_id)
    if not camera_data or "latest_frame" not in camera_data or camera_data["latest_frame"] is None:
        raise HTTPException(status_code=404, detail="No live frame available for this camera.")

    latest_frame = camera_data["latest_frame"]

    # Ensure the snapshot directory exists
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)

    # Generate a unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{camera_id}_{timestamp}.jpg"
    filepath = os.path.join(SNAPSHOT_DIR, filename)

    # Save the frame as a JPEG image
    success, encoded_image = cv2.imencode(".jpg", latest_frame)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode image.")

    with open(filepath, "wb") as f:
        f.write(encoded_image.tobytes())

    snapshot_url = f"/static/snapshots/{filename}" # This path needs to be served by FastAPI
    return {"image_url": snapshot_url}

@router.get("/{camera_id}/health")
def get_camera_health(camera_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Retrieve health metrics for a specific camera.
    """
    db_camera = db.query(models.Camera).filter(models.Camera.id == camera_id, models.Camera.owner_id == current_user.id).first()
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    camera_health_data = latest_camera_data.get(camera_id, {})
    
    return {
        "camera_id": str(camera_id),
        "status": db_camera.status, # Still get status from DB as it's the authoritative source
        "latency_ms": camera_health_data.get("latency_ms", 0),
        "cpu_usage": camera_health_data.get("cpu_usage", 0),
        "last_updated": camera_health_data.get("last_updated", None) # Assuming a timestamp is also stored
    }
