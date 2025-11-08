from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from database import models, database
from api.schemas import security as security_schema
from core import security

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)

@router.post("/register", response_model=security_schema.User)
def register_user(user: security_schema.UserCreate, db: Session = Depends(database.get_db)):
    """
    Register a new user.
    """
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # TEMPORARY: Storing plain password directly as requested by user. THIS IS INSECURE AND MUST BE REVERTED.
    # The actual fix for bcrypt/passlib issue will be addressed later.
    db_user = models.User(email=user.email, name=user.name, password=user.password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/token", response_model=security_schema.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    """
    Authenticate user and return a JWT access token.
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first() # Frontend sends email in username field
    # TEMPORARY: Verifying plain password directly as requested by user. THIS IS INSECURE AND MUST BE REVERTED.
    # The actual fix for bcrypt/passlib issue will be addressed later.
    if not user or user.password != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds())
    }

@router.get("/me", response_model=security_schema.User)
def read_users_me(current_user: models.User = Depends(security.get_current_user)):
    """
    Retrieve details of the current authenticated user.
    """
    return current_user

@router.put("/profile", response_model=security_schema.User)
def update_user_profile(
    user_update: security_schema.UserCreate, # Reusing UserCreate for simplicity, but a dedicated UserUpdate schema would be better
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Update the profile of the current authenticated user.
    """
    if user_update.email != current_user.email:
        existing_user = db.query(models.User).filter(models.User.email == user_update.email).first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already registered by another user")

    current_user.email = user_update.email
    current_user.name = user_update.name
    # TEMPORARY: Storing plain password directly as requested by user. THIS IS INSECURE AND MUST BE REVERTED.
    # The actual fix for bcrypt/passlib issue will be addressed later.
    current_user.password = user_update.password # Update password directly if provided
    # Role update should be handled by admin, not self-service
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
