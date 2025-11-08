from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel # Import BaseModel

from ...database import models, database
from ..schemas import log as log_schema
from ...core.security import get_current_user

router = APIRouter(
    prefix="/logs",
    tags=["logs"],
    dependencies=[Depends(get_current_user)],
    responses={404: {"description": "Not found"}},
)

class PaginatedLogsResponse(BaseModel):
    items: List[log_schema.PlateLog]
    total: int

@router.get("/", response_model=PaginatedLogsResponse)
def read_logs(
    plate: Optional[str] = None,
    camera_id: Optional[int] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    watchlist_only: Optional[bool] = False,
    min_confidence: Optional[float] = None,
    page: int = 1,
    per_page: int = 10,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retrieve a paginated list of plate logs for the current user with filtering options.
    """
    query = db.query(models.PlateLog).filter(models.PlateLog.user_id == current_user.id)

    if plate:
        query = query.filter(models.PlateLog.plate_text.ilike(f"%{plate}%"))
    if camera_id:
        query = query.filter(models.PlateLog.camera_id == camera_id)
    if from_date:
        query = query.filter(models.PlateLog.timestamp >= from_date)
    if to_date:
        query = query.filter(models.PlateLog.timestamp <= to_date)
    if min_confidence is not None:
        query = query.filter(models.PlateLog.confidence >= min_confidence)
    
    if watchlist_only:
        # Subquery to get plate_texts from the user's watchlist
        watchlist_plates = db.query(models.Watchlist.plate_text).filter(
            models.Watchlist.owner_id == current_user.id
        ).subquery()
        query = query.filter(models.PlateLog.plate_text.in_(watchlist_plates))

    total_logs = query.count()
    logs = query.order_by(models.PlateLog.timestamp.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    return {"items": logs, "total": total_logs}

@router.get("/{log_id}", response_model=log_schema.PlateLog)
def read_single_log(log_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Retrieve a single plate log by its ID, ensuring it belongs to the current user.
    """
    db_log = db.query(models.PlateLog).filter(models.PlateLog.id == log_id, models.PlateLog.user_id == current_user.id).first()
    if db_log is None:
        raise HTTPException(status_code=404, detail="Log entry not found")
    return db_log

@router.get("/export", response_class=Response)
def export_logs(
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    format: str = "csv", # "csv" or "pdf"
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Export plate logs as CSV or PDF.
    """
    query = db.query(models.PlateLog).filter(models.PlateLog.user_id == current_user.id)

    if from_date:
        query = query.filter(models.PlateLog.timestamp >= from_date)
    if to_date:
        query = query.filter(models.PlateLog.timestamp <= to_date)
    
    logs_to_export = query.order_by(models.PlateLog.timestamp.desc()).all()

    if format == "csv":
        import io
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Plate", "Timestamp", "Camera ID", "Confidence", "Image URL", "Metadata"])
        for log in logs_to_export:
            writer.writerow([
                log.id,
                log.plate_text,
                log.timestamp.isoformat(),
                log.camera_id,
                log.confidence,
                log.image_snapshot_ref,
                str(log.extra_metadata)
            ])
        
        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=plate_logs.csv"}
        )
    elif format == "pdf":
        # Placeholder for PDF generation - requires a library like ReportLab or FPDF
        raise HTTPException(status_code=501, detail="PDF export not yet implemented")
    else:
        raise HTTPException(status_code=400, detail="Invalid export format. Choose 'csv' or 'pdf'.")
