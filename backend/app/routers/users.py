from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_role
from .. import models
from ..integrations import send_email

router = APIRouter(prefix="/api/users", tags=["users"])


def user_out(u: models.User):
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "invited": u.invited,
        "created_date": u.created_date.isoformat() if u.created_date else None,
    }


@router.get("")
def list_users(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    return [user_out(u) for u in db.query(models.User).order_by(models.User.created_date.desc()).all()]


class InviteIn(BaseModel):
    email: EmailStr
    full_name: str = ""
    role: str = "staff"


@router.post("/invite")
def invite_user(body: InviteIn, db: Session = Depends(get_db), _admin=Depends(require_role("admin"))):
    existing = db.query(models.User).filter(models.User.email == body.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    user = models.User(email=body.email.lower(), full_name=body.full_name, role=body.role, invited=True)
    db.add(user)
    db.commit()
    send_email(
        to=body.email,
        subject="You've been invited to DairyPro",
        body=f"Hi {body.full_name or ''},\n\nYou've been invited to join the DairyPro farm management app as a {body.role}. Sign up with this email address to activate your account.",
    )
    return {"ok": True}


class RoleIn(BaseModel):
    role: str


@router.put("/{user_id}")
def update_user(user_id: str, body: RoleIn, db: Session = Depends(get_db), _admin=Depends(require_role("admin"))):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.role
    db.commit()
    return user_out(user)


@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), _admin=Depends(require_role("admin"))):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"ok": True}
