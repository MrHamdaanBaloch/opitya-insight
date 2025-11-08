from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from database import models, database
from core.security import get_current_user

router = APIRouter(
    prefix="/health",
    tags=["health"],
    dependencies=[Depends(get_current_user)],
    responses={404: {"description": "Not found"}},
)

class CameraHealth(BaseModel):
    camera_id: str
    status: str # online, offline, error
    latency_ms: int
    cpu_usage: int

@router.get("/cameras", response_model=List[CameraHealth])
def get_cameras_health(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Retrieve health metrics for all cameras owned by the current user.
    (Placeholder - actual implementation needs stream monitoring)
    """
    cameras = db.query(models.Camera).filter(models.Camera.owner_id == current_user.id).all()
    
    health_data = []
    for camera in cameras:
        health_data.append({
            "camera_id": str(camera.id),
            "status": camera.status,
            "latency_ms": 0, # Placeholder
            "cpu_usage": 0   # Placeholder
        })
    return health_data
