from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class KPISchema(BaseModel):
    activeCameras: int
    totalCameras: int
    detectionsToday: int
    watchlistHits: int
    avgLatency: int # Placeholder for now

    class Config:
        from_attributes = True

class RecentDetectionSchema(BaseModel):
    id: int
    plate_text: str
    camera_name: str
    timestamp: datetime
    confidence: int
    is_watchlist_hit: bool

    class Config:
        from_attributes = True

class CameraStatusSchema(BaseModel):
    id: int
    name: str
    site: Optional[str] = None
    status: str
    latency: int # Placeholder for now

    class Config:
        from_attributes = True

class DetectionTrendSchema(BaseModel):
    date: datetime
    detections: int

    class Config:
        from_attributes = True

class DetectionTypeSchema(BaseModel):
    name: str
    value: int
    color: str

    class Config:
        from_attributes = True
