import asyncio
import cv2
import numpy as np
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware # Import CORSMiddleware
import pathlib
import base64
import subprocess
import threading
from queue import Queue, Empty
import time
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker # Import sessionmaker for db_session_factory
import inspect # Import inspect to check function signature
from datetime import datetime # Import datetime for StreamWorker

# --- Database Imports ---
from database import models
from database.database import SessionLocal, create_db_and_tables, get_db
from database.models import PlateLog, Camera, Watchlist, User
from api.routers import logs, cameras, auth, watchlist, admin, alerts, health, dashboard
from core import security # Re-import security
from core.worker_manager import active_stream_workers, latest_camera_data, _start_stream_worker_instance, _stop_all_stream_workers_instances, initialize_persistent_workers # Import worker management from new file

# --- StreamWorker Imports and Definition (Modified) ---
from processing.stream_worker import StreamWorker # Only import the StreamWorker class

# --- Configuration & Initialization ---
logging.basicConfig(level=logging.INFO) # Changed to INFO for less verbose output
logger = logging.getLogger(__name__)

def initialize_admin_user():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "admin@optiya.com").first()
        if not admin_user:
            logger.info("No admin user found. Creating default admin user.")
            # TEMPORARY: Storing plain password to bypass bcrypt error. THIS IS INSECURE AND MUST BE REVERTED.
            # The actual fix for bcrypt/passlib issue will be addressed later.
            admin_password_plain = "admin"
            admin_user = User(
                email="admin@optiya.com",
                name="Admin",
                # For now, store plain password directly as requested by user.
                # This is highly insecure and must be replaced with proper hashing.
                password=admin_password_plain,
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            logger.info("Default admin user 'admin@optiya.com' created.")
        else:
            logger.info("Admin user 'admin@optiya.com' already exists.")
    except Exception as e:
        logger.error(f"Error initializing admin user: {e}")
    finally:
        db.close()

app = FastAPI(title="Optiya INSIGHT - ANPR Streaming API")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request

@app.middleware("http")
async def log_headers(request: Request, call_next):
    logger.debug(f"Request headers: {request.headers}")
    response = await call_next(request)
    return response

# --- API Router Integration ---
app.include_router(logs.router)
app.include_router(cameras.router)
app.include_router(auth.router)
app.include_router(watchlist.router)
app.include_router(admin.router)
app.include_router(alerts.router)
app.include_router(health.router)
app.include_router(dashboard.router)

@app.on_event("startup")
def on_startup():
    """Create database and tables, initialize admin user, and start persistent stream workers on application startup."""
    create_db_and_tables()
    initialize_admin_user()
    initialize_persistent_workers() # Call the function from worker_manager

@app.on_event("shutdown")
def on_shutdown():
    """Stop all active stream workers on application shutdown."""
    _stop_all_stream_workers_instances() # Call the function from worker_manager

# --- Path Configuration ---
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE_DIR / "api" / "templates"
templates = Jinja2Templates(directory=TEMPLATE_DIR)

@app.websocket("/ws/streams/{camera_id}")
async def websocket_anpr_stream(
    websocket: WebSocket,
    camera_id: int,
    token: str, # Token from query parameter
    db: Session = Depends(get_db)
):
    await websocket.accept()
    logger.info(f"WebSocket client connected for camera {camera_id}. Token provided: {bool(token)}")
    
    user_camera = None
    current_user = None

    try:
        # --- WebSocket Authentication ---
        if not token:
            await websocket.close(code=1008, reason="Missing token")
            return
        
        try:
            current_user = security.get_current_user_ws(token=token, db=db)
        except HTTPException:
            await websocket.close(code=1008, reason="Invalid token")
            return

        # --- Camera Selection Logic ---
        user_camera = db.query(Camera).filter(
            Camera.id == camera_id,
            Camera.owner_id == current_user.id
        ).first()

        if not user_camera:
            logger.error(f"Camera {camera_id} not found or not owned by user {current_user.email}.")
            await websocket.close(code=1008, reason="Camera not found or unauthorized.")
            return
        
        rtsp_url = user_camera.rtsp_url
        if not rtsp_url:
            logger.error(f"No RTSP URL configured for camera {camera_id}.")
            await websocket.send_json({"error": "RTSP URL is required for this camera."})
            return
        
        # Ensure the StreamWorker is running for this camera (it should be persistent now)
        if camera_id not in active_stream_workers or not active_stream_workers[camera_id].is_alive():
            logger.warning(f"Stream worker for camera {camera_id} was not active. Starting it now.")
            _start_stream_worker_instance(camera_id, rtsp_url, SessionLocal, latest_camera_data)
        
        await websocket.send_json({"status": f"Connected to live stream for camera {camera_id}."})

        while True:
            try:
                # Read latest data from the shared global dictionary
                if camera_id in latest_camera_data and latest_camera_data[camera_id]:
                    data = latest_camera_data[camera_id]
                    
                    # Ensure data is fresh enough, or send a "waiting" message
                    # This logic can be refined based on how often StreamWorker updates
                    
                    # Check if 'image' key exists and is not None before encoding
                    if "image" in data and data["image"] is not None:
                        jpg_as_text = base64.b64encode(data["image"]).decode('utf-8')
                        # Ensure plates are sent as a list of dictionaries with full details
                        # The stream_worker.py is now storing full detection objects in 'plates'
                        plates_to_send = data.get("plates", [])
                        logger.debug(f"WebSocket sending plates: {plates_to_send}") # Debug log for plates data
                        await websocket.send_json({
                            "image": jpg_as_text,
                            "plates": plates_to_send, 
                            "frame": data.get("frame", None),
                            "latency": data.get("latency", 0),
                            "health": data.get("health", 0),
                            "status": data.get("status", "offline")
                        })
                    else:
                        await websocket.send_json({"status": "Waiting for stream data (no image yet)..."})
                else:
                    await websocket.send_json({"status": "Waiting for stream data..."})

                await asyncio.sleep(0.01) # Send updates at ~100 FPS for smoother video

            except WebSocketDisconnect:
                logger.info(f"Client disconnected from camera {camera_id}.")
                break

            except Exception as e:
                logger.error(f"Streaming error for camera {camera_id}: {e}", exc_info=True)
                break

    finally:
        logger.info(f"Cleaning up WebSocket connection for camera {camera_id}.")
        try:
            await websocket.close()
        except RuntimeError as e:
            logger.warning(f"Could not gracefully close WebSocket for camera {camera_id}: {e}")
        
        # No need to stop the stream worker here, it runs persistently
        logger.info(f"WebSocket cleanup complete for camera {camera_id}. Stream worker remains active.")
