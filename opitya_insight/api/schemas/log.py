import datetime
from typing import Optional
from pydantic import BaseModel

class PlateLogBase(BaseModel):
    plate_text: str
    confidence: int # 0-100 integer
    camera_id: int
    image_snapshot_ref: Optional[str] = None # Reference to S3/MinIO storage path
    extra_metadata: Optional[dict] = None # Additional metadata

class PlateLogCreate(PlateLogBase):
    pass

class PlateLog(PlateLogBase):
    id: int
    timestamp: datetime.datetime

    class Config:
        from_attributes = True
