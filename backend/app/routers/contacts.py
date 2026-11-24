from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import audit, current_user
from app.models import Contact, User
from app.schemas import ContactIn, ContactOut

router = APIRouter(prefix="/contacts", tags=["contacts"])


def _own(db: Session, user: User, contact_id: str) -> Contact:
    c = db.get(Contact, contact_id)
    if not c or c.user_id != user.id:
        raise HTTPException(404, "Contact not found")
    return c


@router.get("", response_model=list[ContactOut])
def list_contacts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Contact).where(Contact.user_id == user.id)).all()


@router.post("", response_model=ContactOut, status_code=201)
def add_contact(data: ContactIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = Contact(user_id=user.id, **data.model_dump())
    db.add(c)
    audit(db, user.id, "create", "contact")
    db.commit()
    db.refresh(c)
    return c


@router.put("/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: str, data: ContactIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own(db, user, contact_id)
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    audit(db, user.id, "update", f"contact:{c.id}")
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own(db, user, contact_id)
    audit(db, user.id, "delete", f"contact:{c.id}")
    db.delete(c)
    db.commit()
