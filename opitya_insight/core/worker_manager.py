import logging
import threading
import inspect
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker

from opitya_insight.database import models
from opitya_insight.database.database import SessionLocal
from opitya_insight.processing.stream_worker import StreamWorker

logger = logging.getLogger(__name__)

# Global dictionary to keep track of active stream workers
active_stream_workers: dict[int, StreamWorker] = {}
# Global dictionary to hold the latest processed data for each camera
latest_camera_data: dict[int, dict] = {} # Stores {'image': bytes, 'plates': list, 'timestamp': datetime, 'latency_ms': int, 'cpu_usage': float}

# Lock for synchronizing access to active_stream_workers and latest_camera_data
_worker_manager_lock = threading.Lock()

def _stop_stream_worker_instance(camera_id: int):
    with _worker_manager_lock:
        if camera_id in active_stream_workers:
            worker = active_stream_workers[camera_id]
            worker.stop()
            worker.join() # Wait for the thread to finish
            del active_stream_workers[camera_id]
            # Also remove from latest_camera_data
            if camera_id in latest_camera_data:
                del latest_camera_data[camera_id]
            logger.info(f"Stream worker for camera {camera_id} stopped and removed.")
        else:
            logger.warning(f"No active stream worker found for camera {camera_id}. It might have already stopped or never started.")

def _stop_all_stream_workers_instances():
    logger.info("Stopping all active stream workers...")
    # Iterate over a copy of keys to avoid RuntimeError due to dictionary size change during iteration
    with _worker_manager_lock:
        for camera_id in list(active_stream_workers.keys()):
            _stop_stream_worker_instance(camera_id)
    logger.info("All stream workers stopped.")

def _start_stream_worker_instance(camera_id: int, rtsp_url: str, db_session_factory, shared_data: dict):
    logger.info(f"_start_stream_worker_instance called for camera {camera_id}.")
    with _worker_manager_lock:
        if camera_id in active_stream_workers and active_stream_workers[camera_id].is_alive():
            logger.warning(f"Stream worker for camera {camera_id} is already running.")
            return

        worker = StreamWorker(camera_id, rtsp_url, db_session_factory, shared_data)
        active_stream_workers[camera_id] = worker
        worker.start()
        logger.info(f"Stream worker for camera {camera_id} started.")
        return worker

def initialize_persistent_workers():
    """Starts persistent stream workers for all active cameras on application startup."""
    _stop_all_stream_workers_instances() # Ensure no old workers are running
    logger.info(f"_start_stream_worker_instance signature on startup: {inspect.signature(_start_stream_worker_instance)}")
    
    db = SessionLocal()
    try:
        cameras_to_start = db.query(models.Camera).all() # Or filter by an 'is_active' flag
        for camera in cameras_to_start:
            if camera.rtsp_url: # Only start if RTSP URL is configured
                _start_stream_worker_instance(camera.id, camera.rtsp_url, SessionLocal, latest_camera_data)
                logger.info(f"Attempted to start persistent stream worker for camera {camera.name} (ID: {camera.id}) on startup.")
            else:
                logger.warning(f"Camera {camera.name} (ID: {camera.id}) has no RTSP URL, skipping persistent worker startup.")
    except Exception as e:
        logger.error(f"Error starting persistent stream workers on startup: {e}", exc_info=True)
    finally:
        db.close()
