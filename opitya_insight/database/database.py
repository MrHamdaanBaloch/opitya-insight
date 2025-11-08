from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base
import os

# --- Database Configuration ---
# Use SQLite for local development, but prepare for PostgreSQL in production.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./opitya_insight.db")

# The 'check_same_thread' argument is specific to SQLite.
# It is not needed for PostgreSQL.
engine_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=engine_args)

# --- Session Management ---
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_db_and_tables():
    """
    Creates the database and all defined tables if they don't already exist.
    This should be called once on application startup.
    """
    print("Creating database and tables...")
    Base.metadata.create_all(bind=engine)
    print("Database and tables created successfully.")

# --- Dependency for FastAPI ---
def get_db():
    """
    FastAPI dependency to get a database session for a single request.
    Ensures the session is always closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
