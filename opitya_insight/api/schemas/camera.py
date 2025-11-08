import datetime
from typing import Optional
from pydantic import BaseModel

class CameraBase(BaseModel):
    name: str
    rtsp_url: str
    site: Optional[str] = None
    meta: Optional[dict] = None

class CameraCreate(CameraBase):
    pass

class Camera(CameraBase):
    id: int
    status: str # online, offline, error
    last_seen: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True
