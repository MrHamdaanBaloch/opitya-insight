from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import models, database
from api.schemas import watchlist as watchlist_schema
from core.security import get_current_user

router = APIRouter(
    prefix="/watchlist",
    tags=["watchlist"],
    dependencies=[Depends(get_current_user)],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=watchlist_schema.Watchlist)
def create_watchlist_entry(entry: watchlist_schema.WatchlistCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Create a new watchlist entry for the current user.
    """
    # Check for duplicate plate_text for the current user
    existing_entry = db.query(models.Watchlist).filter(
        models.Watchlist.owner_id == current_user.id,
        models.Watchlist.plate_text == entry.plate_text # Changed from entry.plate to entry.plate_text
    ).first()

    if existing_entry:
        raise HTTPException(status_code=400, detail=f"Plate '{entry.plate_text}' already exists in your watchlist.")

    try:
        db_entry = models.Watchlist(
            plate_text=entry.plate_text, # Changed from entry.plate to entry.plate_text
            description=entry.description, # Changed from entry.label to entry.description
            notify_sms=int(entry.notify_sms),
            notify_email=int(entry.notify_email),
            owner_id=current_user.id
        )
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        
        # Populate created_by for the response model
        response_entry = watchlist_schema.Watchlist.from_orm(db_entry)
        response_entry.created_by = current_user.email # Or current_user.name
        return response_entry
    except Exception as e:
        db.rollback() # Rollback in case of any database error
        raise HTTPException(status_code=500, detail=f"Failed to create watchlist entry: {e}")

@router.get("/", response_model=List[watchlist_schema.Watchlist])
def read_watchlist(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Retrieve a list of watchlist entries for the current user.
    """
    entries = db.query(models.Watchlist).filter(models.Watchlist.owner_id == current_user.id).offset(skip).limit(limit).all()
    
    # Populate created_by for each entry in the response
    response_entries = []
    for entry in entries:
        response_entry = watchlist_schema.Watchlist.from_orm(entry)
        response_entry.created_by = current_user.email # Or current_user.name
        response_entries.append(response_entry)
    return response_entries

@router.put("/{entry_id}", response_model=watchlist_schema.Watchlist)
def update_watchlist_entry(
    entry_id: int,
    entry_update: watchlist_schema.WatchlistCreate, # Reusing WatchlistCreate for simplicity
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update an existing watchlist entry for the current user.
    """
    db_entry = db.query(models.Watchlist).filter(
        models.Watchlist.id == entry_id,
        models.Watchlist.owner_id == current_user.id
    ).first()

    if db_entry is None:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")

    db_entry.plate_text = entry_update.plate_text # Changed from entry_update.plate to entry_update.plate_text
    db_entry.description = entry_update.description # Changed from entry_update.label to entry_update.description
    db_entry.notify_sms = int(entry_update.notify_sms)
    db_entry.notify_email = int(entry_update.notify_email)
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)

    response_entry = watchlist_schema.Watchlist.from_orm(db_entry)
    response_entry.created_by = current_user.email
    return response_entry


@router.delete("/{entry_id}", status_code=204)
def delete_watchlist_entry(entry_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Delete a watchlist entry by its ID, ensuring it belongs to the current user.
    """
    db_entry = db.query(models.Watchlist).filter(models.Watchlist.id == entry_id, models.Watchlist.owner_id == current_user.id).first()
    if db_entry is None:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")
    db.delete(db_entry)
    db.commit()
    return
