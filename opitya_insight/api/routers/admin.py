from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from ...database import models, database
from ...core.security import get_current_user, require_admin
from pydantic import BaseModel

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)], # Only admin users can access these endpoints
    responses={403: {"description": "Not authorized"}, 404: {"description": "Not found"}},
)

class AdminSettings(BaseModel):
    retention_days: int
    concurrent_streams_limit: int = 10 # Default as per BRD

class AdminSettingsUpdate(BaseModel):
    retention_days: Optional[int] = None
    concurrent_streams_limit: Optional[int] = None

# Placeholder for actual settings storage (e.g., in DB or config file)
# For now, we'll use a simple in-memory dictionary.
# In a real application, these would be persisted.
_admin_settings = {
    "retention_days": 30,
    "concurrent_streams_limit": 10
}

@router.get("/settings", response_model=AdminSettings)
def get_admin_settings():
    """
    Retrieve current admin settings.
    """
    return _admin_settings

@router.post("/settings", response_model=AdminSettings)
def update_admin_settings(settings_update: AdminSettingsUpdate):
    """
    Update admin settings.
    """
    if settings_update.retention_days is not None:
        _admin_settings["retention_days"] = settings_update.retention_days
    if settings_update.concurrent_streams_limit is not None:
        _admin_settings["concurrent_streams_limit"] = settings_update.concurrent_streams_limit
    
    return _admin_settings
