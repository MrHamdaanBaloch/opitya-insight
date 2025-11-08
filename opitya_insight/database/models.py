import datetime
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False, default="User")
    # TEMPORARY: Storing plain password to bypass bcrypt error. THIS IS INSECURE AND MUST BE REVERTED.
    # The actual fix for bcrypt/passlib issue will be addressed later.
    password = Column(String, nullable=True) # Changed to nullable=True for flexibility, though admin will have a password
    role = Column(String, default="viewer", nullable=False)  # 'admin' or 'viewer'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    cameras = relationship("Camera", back_populates="owner")
    watchlists = relationship("Watchlist", back_populates="owner")

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    rtsp_url = Column(String, unique=True, nullable=False)
    status = Column(String, default="offline") # online, offline, error
    last_seen = Column(DateTime, nullable=True)
    site = Column(String, nullable=True)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="cameras")
    logs = relationship("PlateLog", back_populates="camera")

class PlateLog(Base):
    __tablename__ = "plate_logs"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plate_text = Column(String, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    confidence = Column(Integer) # Changed to Integer for 0-100 range
    image_snapshot_ref = Column(String, nullable=True) # Reference to S3/MinIO storage path
    extra_metadata = Column(JSON, nullable=True) # Additional metadata
    
    camera = relationship("Camera", back_populates="logs")

class Watchlist(Base):
    __tablename__ = "watchlists"
    id = Column(Integer, primary_key=True, index=True)
    plate_text = Column(String, index=True, nullable=False) # Not unique anymore, can be on multiple user's lists
    description = Column(String, nullable=True) # Renamed to label in frontend spec
    notify_sms = Column(Integer, default=0) # 0 for false, 1 for true
    notify_email = Column(Integer, default=1) # 0 for false, 1 for true
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="watchlists")
