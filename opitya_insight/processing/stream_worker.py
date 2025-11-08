import cv2
from ultralytics import YOLO
from fast_plate_ocr import LicensePlateRecognizer
import logging
import threading
import time
from datetime import datetime
from queue import Queue
import pathlib
# Configure logging
logging.basicConfig(level=logging.DEBUG) # Changed to DEBUG for detailed performance logging
logger = logging.getLogger(__name__)

logger.info("STREAM_WORKER_MODULE_LOADED: Version with 4 arguments for start_stream_worker.") # Added for debugging module loading

from ..database import models, database

class StreamWorker(threading.Thread):
    def __init__(self, camera_id: int, rtsp_url: str, db_session_factory, shared_data: dict):
        super().__init__()
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.db_session_factory = db_session_factory
        self.shared_data = shared_data # Shared dictionary to update with processed frames and data
        self.running = True
        self.detection_model = None
        self.ocr_model = None
        self.frame_skip = 3 # Process every 3rd frame for a balance of smoothness and performance
        self.plate_log_queue = Queue() # Queue for asynchronous plate logging
        
        # Real-World Scenario Enhancements (moved from main.py)
        self.PLATE_COOLDOWN_SECONDS = 15  # Cooldown to prevent re-logging the same plate.
        self.STABILIZATION_THRESHOLD = 3  # Require a plate to be seen this many times to be considered stable.
        self.CANDIDATE_PATIENCE_FRAMES = 10 # How many frames to wait before discarding an unstable candidate.

        # State Management (moved from main.py)
        self.recently_seen_plates = {} # Tracks the last time a confirmed plate was logged to enforce cooldown. {plate_text: timestamp}
        self.candidate_plates = {} # Tracks potential plates that have not yet met the stabilization threshold. {plate_text: {'count': int, 'last_seen_frame': int}}

        logger.info(f"StreamWorker for camera {self.camera_id} initialized with URL: {self.rtsp_url}")

    def _initialize_models(self):
        # Construct absolute path to the model file
        base_dir = pathlib.Path(__file__).resolve().parent.parent.parent # Go up from processing to opitya_insight
        model_path = base_dir / "opitya_insight" / "models" / "weights" / "LP-detection.pt"
        
        ocr_model_name = "cct-xs-v1-global-model"

        logger.info(f"Loading detection model from {model_path} for camera {self.camera_id} with imgsz=320...")
        try:
            self.detection_model = YOLO(str(model_path)) # Load model
            self.detection_model.fuse() # Fuse model for faster inference
            logger.info(f"Detection model loaded successfully for camera {self.camera_id}.")
        except Exception as e:
            logger.error(f"Error loading detection model for camera {self.camera_id}: {e}")
            logger.error("The YOLO model failed to load. This might be due to a corrupted model file or an incompatibility with the installed ultralytics/PyTorch versions. Please ensure your environment is consistent with when the model was working.")
            return False

        logger.info(f"Initializing OCR model for camera {self.camera_id}...")
        try:
            self.ocr_model = LicensePlateRecognizer(ocr_model_name)
            logger.info(f"OCR model initialized successfully for camera {self.camera_id}.")
        except Exception as e:
            logger.error(f"Error initializing OCR model for camera {self.camera_id}: {e}")
            return False
        return True

    def _update_camera_status(self, status: str):
        db = self.db_session_factory()
        try:
            camera = db.query(models.Camera).filter(models.Camera.id == self.camera_id).first()
            if camera:
                camera.status = status
                camera.last_seen = datetime.utcnow()
                db.add(camera)
                db.commit()
                db.refresh(camera)
                logger.info(f"Camera {self.camera_id} status updated to {status}.")
        except Exception as e:
            logger.error(f"Error updating camera {self.camera_id} status to {status}: {e}")
        finally:
            db.close()

    def _save_plate_logs_batch(self, plate_detections: list, user_id: int):
        if not plate_detections:
            return

        db = self.db_session_factory()
        try:
            plate_logs = []
            for detection in plate_detections:
                plate_log = models.PlateLog(
                    camera_id=self.camera_id,
                    user_id=user_id,
                    plate_text=detection["plate_text"],
                    timestamp=datetime.utcnow(),
                    confidence=int(detection["confidence"] * 100)
                )
                plate_logs.append(plate_log)
            
            db.add_all(plate_logs)
            db.commit()
            for log in plate_logs:
                db.refresh(log)
            logger.info(f"Batch saved {len(plate_logs)} PlateLogs for camera {self.camera_id}.")
        except Exception as e:
            logger.error(f"Error saving batch PlateLogs for camera {self.camera_id}: {e}")
        finally:
            db.close()

    def _log_plates_from_queue(self):
        while self.running or not self.plate_log_queue.empty():
            try:
                plate_detections_batch, user_id = self.plate_log_queue.get(timeout=1) # Wait for 1 second
                self._save_plate_logs_batch(plate_detections_batch, user_id)
                self.plate_log_queue.task_done()
            except Exception as e:
                # This can happen if queue is empty and timeout occurs, which is fine during shutdown
                if self.running: # Only log if worker is still supposed to be running
                    logger.error(f"Error processing plate log queue for camera {self.camera_id}: {e}")
            time.sleep(0.1) # Small sleep to prevent busy-waiting

    def run(self):
        if not self._initialize_models():
            self._update_camera_status("offline")
            return

        logger.info(f"Attempting to open video stream for camera {self.camera_id} from {self.rtsp_url}")
        cap = cv2.VideoCapture(self.rtsp_url)

        if not cap.isOpened():
            logger.error(f"Error: Could not open video stream for camera {self.camera_id} from {self.rtsp_url}. Please check the RTSP URL and camera availability.")
            self._update_camera_status("offline")
            return

        logger.info(f"Successfully opened video stream for camera {self.camera_id}.")
        self._update_camera_status("online")
        
        # Start the asynchronous logging thread
        logging_thread = threading.Thread(target=self._log_plates_from_queue, daemon=True)
        logging_thread.start()
        logger.info(f"Asynchronous logging thread started for camera {self.camera_id}.")

        frame_count = 0
        while self.running:
            frame_read_start_time = time.perf_counter()
            ret, frame = cap.read()
            frame_read_end_time = time.perf_counter()
            # logger.debug(f"Camera {self.camera_id} - Frame {frame_count} Read took {(frame_read_end_time - frame_read_start_time) * 1000:.2f} ms")

            if not ret:
                logger.warning(f"End of stream or cannot read frame for camera {self.camera_id}. Attempting to reconnect...")
                cap.release()
                time.sleep(5) # Wait before attempting to reconnect
                cap = cv2.VideoCapture(self.rtsp_url)
                if not cap.isOpened():
                    logger.error(f"Failed to reconnect to stream for camera {self.camera_id}.")
                    self._update_camera_status("offline")
                    break # Exit if reconnection fails
                else:
                    logger.info(f"Successfully reconnected to stream for camera {self.camera_id}.")
                    self._update_camera_status("online")
                continue

            frame_count += 1
            if frame_count % self.frame_skip != 0:
                continue

            annotated_frame = frame.copy()
            
            detection_start_time = time.perf_counter()
            results = self.detection_model(frame)
            detection_end_time = time.perf_counter()
            detection_time_ms = (detection_end_time - detection_start_time) * 1000
            # logger.debug(f"Camera {self.camera_id} - Frame {frame_count} Detection took {detection_time_ms:.2f} ms")
            
            stabilized_plates_in_frame = []
            current_time = time.time()

            for result in results:
                for box in result.boxes:
                    xyxy = box.xyxy[0].tolist()
                    conf = box.conf[0].item()
                    
                    # Enforce 70% confidence threshold for detection
                    if conf < 0.70:
                        # logger.debug(f"Camera {self.camera_id} - Skipping detection due to low confidence ({conf:.2f} < 0.70)")
                        continue # Skip this detection if confidence is too low

                    x1, y1, x2, y2 = map(int, xyxy)
                    plate_crop = frame[y1:y2, x1:x2]

                    # Ensure plate_crop is not empty before OCR
                    if plate_crop.shape[0] == 0 or plate_crop.shape[1] == 0:
                        # logger.warning(f"Camera {self.camera_id} - Empty plate crop for detection with confidence {conf:.2f}. Skipping OCR.")
                        continue

                    ocr_start_time = time.perf_counter()
                    ocr_results = self.ocr_model.run(plate_crop)
                    ocr_end_time = time.perf_counter()
                    ocr_time_ms = (ocr_end_time - ocr_start_time) * 1000
                    # logger.debug(f"Camera {self.camera_id} - Frame {frame_count} OCR took {ocr_time_ms:.2f} ms")

                    if ocr_results:
                        plate_text = ocr_results[0]
                        
                        # 1. Check if plate is on cooldown (already logged recently)
                        if plate_text in self.recently_seen_plates and \
                           (current_time - self.recently_seen_plates[plate_text] < self.PLATE_COOLDOWN_SECONDS):
                            # Still draw the box, but don't process for logging.
                            label = f"{plate_text} ({conf:.2f})"
                            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                            cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                            continue

                        # 2. Update candidate plates
                        if plate_text in self.candidate_plates:
                            self.candidate_plates[plate_text]['count'] += 1
                            self.candidate_plates[plate_text]['last_seen_frame'] = frame_count
                        else:
                            # New candidate detected
                            self.candidate_plates[plate_text] = {'count': 1, 'last_seen_frame': frame_count}
                        
                        # 3. Check for stabilization and promote if ready
                        if self.candidate_plates[plate_text]['count'] >= self.STABILIZATION_THRESHOLD:
                            stabilized_plates_in_frame.append(plate_text)
                            self.recently_seen_plates[plate_text] = current_time  # Start cooldown
                            del self.candidate_plates[plate_text] # Remove from candidates

                        # Always draw the box for visual feedback
                        label = f"{plate_text} ({conf:.2f})"
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                        
                        # Store the detection with bounding box and confidence
                        stabilized_plates_in_frame.append({
                            "plate_text": plate_text,
                            "confidence": conf,
                            "box": [x1, y1, x2, y2]
                        })
                    else:
                        # If OCR fails, still draw detection box if confidence is high enough
                        label = f"No OCR ({conf:.2f})"
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 165, 255), 2) # Orange for no OCR
                        cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)
                        
                        # Store the detection even if OCR failed, but with N/A plate text
                        stabilized_plates_in_frame.append({
                            "plate_text": "N/A",
                            "confidence": conf,
                            "box": [x1, y1, x2, y2]
                        })


            # --- Prune stale candidates ---
            stale_candidates = [
                p for p, data in self.candidate_plates.items() 
                if frame_count - data['last_seen_frame'] > self.CANDIDATE_PATIENCE_FRAMES
            ]
            for p in stale_candidates:
                del self.candidate_plates[p]

            frame_end_time = time.perf_counter()
            processing_time_ms = (frame_end_time - frame_read_start_time) * 1000 # Total time from read to end
            # logger.debug(f"Camera {self.camera_id} - Frame {frame_count} total processing took {processing_time_ms:.2f} ms")

            # --- Database Logging & Watchlist Check (Asynchronous) ---
            if stabilized_plates_in_frame:
                user_id = None 
                db = self.db_session_factory()
                try:
                    camera_obj = db.query(models.Camera).filter(models.Camera.id == self.camera_id).first()
                    if camera_obj:
                        user_id = camera_obj.owner_id

                    if user_id:
                        watchlist_entries = db.query(models.Watchlist).filter(models.Watchlist.owner_id == user_id).all()
                        watchlist_plates = {entry.plate_text for entry in watchlist_entries}

                        for plate_detection in stabilized_plates_in_frame:
                            plate_text = plate_detection["plate_text"]
                            # confidence = plate_detection["confidence"] # Confidence is now part of the detection dict

                            if plate_text != "N/A" and plate_text in watchlist_plates:
                                logger.warning(f"** WATCHLIST ALERT ** Plate '{plate_text}' detected on camera '{self.camera_id}' for user '{user_id}'.")
                                matched_entry = next((entry for entry in watchlist_entries if entry.plate_text == plate_text), None)
                                if matched_entry:
                                    if matched_entry.notify_email:
                                        print(f"Sending email alert for {plate_text} to user {user_id}")
                                    if matched_entry.notify_sms:
                                        print(f"Sending SMS alert for {plate_text} to user {user_id}")

                        # Push all stabilized plates for this frame to the queue for batch logging
                        if stabilized_plates_in_frame:
                            self.plate_log_queue.put((stabilized_plates_in_frame, user_id))
                            logger.info(f"Frame {frame_count}: Pushed {len(stabilized_plates_in_frame)} stabilized plates to queue for camera {self.camera_id}.")
                except Exception as e:
                    logger.error(f"Error in main loop's DB/Watchlist check for camera {self.camera_id}: {e}")
                finally:
                    db.close()

            success, buffer = cv2.imencode('.jpg', annotated_frame)
            if success:
                # Update the shared data dictionary
                self.shared_data[self.camera_id] = {
                    "image": buffer.tobytes(),
                    "plates": stabilized_plates_in_frame, # Now contains list of dicts with plate_text, confidence, box
                    "frame": frame_count,
                    "timestamp": datetime.utcnow(),
                    "status": "online", # Update status in shared data
                    "health": 100, # Placeholder, ideally calculated
                    "latency": processing_time_ms # Report actual processing time as latency
                }

        # --- Cleanup ---
        cap.release()
        self._update_camera_status("offline")
        # Also update shared data to reflect offline status
        if self.camera_id in self.shared_data:
            self.shared_data[self.camera_id]["status"] = "offline"
            self.shared_data[self.camera_id]["image"] = b'' # Clear image
            self.shared_data[self.camera_id]["plates"] = [] # Clear plates
        logger.info(f"Stream processing for camera {self.camera_id} finished.")

    def stop(self):
        self.running = False
        logger.info(f"StreamWorker for camera {self.camera_id} stopping. Waiting for logging queue to empty...")
        self.plate_log_queue.join() # Wait for all items in the queue to be processed
        logger.info(f"StreamWorker for camera {self.camera_id} stopped.")

if __name__ == "__main__":
    # This block is for testing the worker independently if needed
    # In a real application, this would be managed by FastAPI
    # Example usage:
    # from sqlalchemy import create_engine
    # from sqlalchemy.orm import sessionmaker
    # from opitya_insight.database.database import Base
    #
    # SQLALCHEMY_DATABASE_URL = "sqlite:///./opitya_insight.db"
    # engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    # Base.metadata.create_all(bind=engine)
    # SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    #
    # # Dummy camera data for testing
    # test_camera_id = 999
    # test_rtsp_url = "rtsp://rtspstream:-S-8ZCvqgpHEbdhk7NMUW@zephyr.rtsp.stream/traffic"
    #
    # # Create a dummy shared data dictionary for testing
    # test_shared_data = {}
    #
    # worker = StreamWorker(test_camera_id, test_rtsp_url, SessionLocal, test_shared_data)
    # worker.start()
    #
    # try:
    #     while True:
    #         if test_camera_id in test_shared_data:
    #             data = test_shared_data[test_camera_id]
    #             # print(f"Received data from worker: {data['plates']}")
    #         time.sleep(1)
    # except KeyboardInterrupt:
    #     worker.stop()
    #     worker.join()
    pass
