from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import audit, current_user
from app.models import User
from app.schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
def get_profile(user: User = Depends(current_user)):
    return user


@router.put("", response_model=ProfileOut)
def update_profile(data: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    audit(db, user.id, "update", "profile")
    db.commit()
    db.refresh(user)
    return user


@router.delete("", status_code=204)
def delete_account(user: User = Depends(current_user), db: Session = Depends(get_db)):
    audit(db, user.id, "delete", "user")
    db.delete(user)
    db.commit()
