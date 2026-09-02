from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..security import hash_password, verify_password, create_access_token
from .. import models

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def user_out(u: models.User):
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "created_date": u.created_date.isoformat() if u.created_date else None,
    }


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email.lower()).first()
    if existing and existing.password_hash:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    is_first_user = db.query(models.User).count() == 0

    if existing and not existing.password_hash:
        # This email was invited earlier — activate the account now.
        existing.password_hash = hash_password(body.password)
        existing.full_name = body.full_name or existing.full_name
        user = existing
    else:
        user = models.User(
            email=body.email.lower(),
            full_name=body.full_name,
            password_hash=hash_password(body.password),
            role="admin" if is_first_user else "staff",
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.email)
    return {"access_token": token, "token_type": "bearer", "user": user_out(user)}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash or ""):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token(user.id, user.email)
    return {"access_token": token, "token_type": "bearer", "user": user_out(user)}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return user_out(user)


@router.post("/logout")
def logout():
    # Stateless JWT — nothing to invalidate server-side; the client drops the token.
    return {"ok": True}
