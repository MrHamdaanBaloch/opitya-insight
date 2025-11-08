from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import models, database
from core.security import get_current_user

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"],
    dependencies=[Depends(get_current_user)],
    responses={404: {"description": "Not found"}},
)

class TestAlertRequest(BaseModel):
    watchlist_id: int
    method: str # "sms" or "email"

@router.post("/test", status_code=204)
def test_alert(
    request: TestAlertRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Trigger a test alert (SMS or Email) for a specific watchlist entry.
    (Placeholder - actual implementation needs Twilio/SendGrid integration)
    """
    watchlist_entry = db.query(models.Watchlist).filter(
        models.Watchlist.id == request.watchlist_id,
        models.Watchlist.owner_id == current_user.id
    ).first()

    if watchlist_entry is None:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")

    if request.method == "sms":
        # Placeholder for Twilio SMS sending logic
        print(f"Simulating SMS alert for plate: {watchlist_entry.plate_text}")
        print(f"User: {current_user.email}, Watchlist ID: {watchlist_entry.id}")
    elif request.method == "email":
        # Placeholder for SendGrid Email sending logic
        print(f"Simulating Email alert for plate: {watchlist_entry.plate_text}")
        print(f"User: {current_user.email}, Watchlist ID: {watchlist_entry.id}")
    else:
        raise HTTPException(status_code=400, detail="Invalid alert method. Choose 'sms' or 'email'.")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)
