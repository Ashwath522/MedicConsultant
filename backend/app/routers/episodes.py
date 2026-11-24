from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import audit, current_user
from app.extract.llm import suggest_category
from app.models import Episode, User
from app.schemas import EpisodeIn, EpisodeOut, SuggestIn, SuggestOut

router = APIRouter(prefix="/episodes", tags=["episodes"])


def _own(db: Session, user: User, episode_id: str) -> Episode:
    e = db.get(Episode, episode_id)
    if not e or e.user_id != user.id:
        raise HTTPException(404, "Episode not found")
    return e


@router.post("/suggest", response_model=SuggestOut)
async def suggest(data: SuggestIn, user: User = Depends(current_user)):
    """AI suggests a category + title. The user confirms or edits before saving."""
    return await suggest_category(data.description)


@router.get("", response_model=list[EpisodeOut])
def list_episodes(status: str | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(Episode).where(Episode.user_id == user.id)
    if status:
        q = q.where(Episode.status == status)
    return db.scalars(q.order_by(Episode.start_date.desc())).all()


@router.post("", response_model=EpisodeOut, status_code=201)
def create_episode(data: EpisodeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = Episode(
        user_id=user.id,
        title=data.title,
        category=data.category,
        issue_description=data.issue_description,
        start_date=data.start_date or date.today(),
    )
    db.add(e)
    audit(db, user.id, "create", "episode")
    db.commit()
    db.refresh(e)
    return e


@router.get("/{episode_id}", response_model=EpisodeOut)
def get_episode(episode_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = _own(db, user, episode_id)
    audit(db, user.id, "view", f"episode:{e.id}")
    db.commit()
    return e


@router.patch("/{episode_id}/close", response_model=EpisodeOut)
def close_episode(episode_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = _own(db, user, episode_id)
    e.status = "closed"
    audit(db, user.id, "update", f"episode:{e.id}:close")
    db.commit()
    db.refresh(e)
    return e


@router.delete("/{episode_id}", status_code=204)
def delete_episode(episode_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = _own(db, user, episode_id)
    audit(db, user.id, "delete", f"episode:{e.id}")
    db.delete(e)
    db.commit()
