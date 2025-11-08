from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any

from ...database import models, database
from ...core import security
from ..schemas import dashboard as dashboard_schema # Assuming a new schema for dashboard data
from ...core.worker_manager import latest_camera_data # Import latest_camera_data from worker_manager

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)

@router.get("/kpis", response_model=dashboard_schema.KPISchema)
def get_kpis(db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    # Placeholder for KPI logic
    total_cameras = db.query(models.Camera).filter(models.Camera.owner_id == current_user.id).count()
    active_cameras = db.query(models.Camera).filter(models.Camera.owner_id == current_user.id, models.Camera.status == "online").count()
    
    today = datetime.utcnow().date()
    detections_today = db.query(models.PlateLog).filter(
        models.PlateLog.user_id == current_user.id,
        models.PlateLog.timestamp >= today
    ).count()

    watchlist_hits = db.query(models.PlateLog).join(models.Watchlist, models.PlateLog.plate_text == models.Watchlist.plate_text).filter(
        models.PlateLog.user_id == current_user.id,
        models.Watchlist.owner_id == current_user.id,
        models.PlateLog.timestamp >= today
    ).count()

    # Calculate average latency from latest_camera_data
    total_latency = 0
    cameras_with_latency = 0
    for camera_id, data in latest_camera_data.items():
        # Only consider cameras owned by the current user and that are online
        db_camera = db.query(models.Camera).filter(
            models.Camera.id == camera_id,
            models.Camera.owner_id == current_user.id,
            models.Camera.status == "online"
        ).first()
        
        if db_camera and "latency_ms" in data: # Access directly from data
            total_latency += data["latency_ms"]
            cameras_with_latency += 1
    
    avg_latency = total_latency / cameras_with_latency if cameras_with_latency > 0 else 0

    return {
        "activeCameras": active_cameras,
        "totalCameras": total_cameras,
        "detectionsToday": detections_today,
        "watchlistHits": watchlist_hits,
        "avgLatency": avg_latency,
    }

@router.get("/recent-detections", response_model=List[dashboard_schema.RecentDetectionSchema])
def get_recent_detections(db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    # Placeholder for recent detections logic
    recent_logs = db.query(models.PlateLog, models.Camera.name).join(models.Camera).filter(
        models.PlateLog.user_id == current_user.id,
        models.Camera.owner_id == current_user.id
    ).order_by(models.PlateLog.timestamp.desc()).limit(5).all()

    detections = []
    for log, camera_name in recent_logs:
        # Check if the plate is on the user's watchlist
        is_watchlist_hit = db.query(models.Watchlist).filter(
            models.Watchlist.owner_id == current_user.id,
            models.Watchlist.plate_text == log.plate_text
        ).first() is not None

        detections.append({
            "id": log.id,
            "plate_text": log.plate_text,
            "camera_name": camera_name,
            "timestamp": log.timestamp.isoformat(),
            "confidence": log.confidence,
            "is_watchlist_hit": is_watchlist_hit,
        })
    return detections

@router.get("/camera-status", response_model=List[dashboard_schema.CameraStatusSchema])
def get_camera_status(db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    cameras = db.query(models.Camera).filter(models.Camera.owner_id == current_user.id).all()
    
    camera_statuses = []
    for camera in cameras:
        camera_data = latest_camera_data.get(camera.id, {})
        latency = camera_data.get("latency_ms", 0) # Get latency from shared data
        
        camera_statuses.append({
            "id": camera.id,
            "name": camera.name,
            "site": camera.site,
            "status": camera.status,
            "latency": latency,
        })
    return camera_statuses

@router.get("/detection-trends", response_model=List[dashboard_schema.DetectionTrendSchema])
def get_detection_trends(db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    # Placeholder for detection trends logic (last 7 days)
    trends = []
    for i in range(7):
        date = datetime.utcnow().date() - timedelta(days=i)
        detections_on_day = db.query(models.PlateLog).filter(
            models.PlateLog.user_id == current_user.id,
            models.PlateLog.timestamp >= date,
            models.PlateLog.timestamp < date + timedelta(days=1)
        ).count()
        trends.append({"date": date.isoformat(), "detections": detections_on_day})
    return list(reversed(trends)) # Return in ascending order of date

@router.get("/detection-types", response_model=List[dashboard_schema.DetectionTypeSchema])
def get_detection_types(db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    # Placeholder for detection types logic (regular vs watchlist)
    today = datetime.utcnow().date()
    
    total_detections_today = db.query(models.PlateLog).filter(
        models.PlateLog.user_id == current_user.id,
        models.PlateLog.timestamp >= today
    ).count()

    watchlist_detections_today = db.query(models.PlateLog).join(models.Watchlist, models.PlateLog.plate_text == models.Watchlist.plate_text).filter(
        models.PlateLog.user_id == current_user.id,
        models.Watchlist.owner_id == current_user.id,
        models.PlateLog.timestamp >= today
    ).count()
    
    regular_detections_today = total_detections_today - watchlist_detections_today

    return [
        {"name": "Regular Detections", "value": regular_detections_today, "color": "#3b82f6"}, # Blue
        {"name": "Watchlist Detections", "value": watchlist_detections_today, "color": "#ef4444"}, # Red
    ]
