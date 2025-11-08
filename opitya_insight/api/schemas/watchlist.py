import datetime
from typing import Optional
from pydantic import BaseModel

class WatchlistBase(BaseModel):
    plate_text: str
    description: Optional[str] = None
    notify_sms: Optional[int] = 0 # 0 for false, 1 for true
    notify_email: Optional[int] = 1 # 0 for false, 1 for true

class WatchlistCreate(WatchlistBase):
    pass

class Watchlist(WatchlistBase):
    id: int
    created_at: datetime.datetime
    created_by: Optional[str] = None # Add created_by field

    class Config:
        from_attributes = True
