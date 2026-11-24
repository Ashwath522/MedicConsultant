import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    allergies: Mapped[list] = mapped_column(JSON, default=list)
    chronic_conditions: Mapped[list] = mapped_column(JSON, default=list)
    regular_medicines: Mapped[list] = mapped_column(JSON, default=list)
    # Routine, "HH:MM"
    wake_time: Mapped[str] = mapped_column(String(5), default="07:00")
    breakfast_time: Mapped[str] = mapped_column(String(5), default="08:30")
    lunch_time: Mapped[str] = mapped_column(String(5), default="13:30")
    dinner_time: Mapped[str] = mapped_column(String(5), default="20:30")
    bed_time: Mapped[str] = mapped_column(String(5), default="22:30")
    # Body & lifestyle (onboarding) — used for age/sex-specific targets
    sex: Mapped[str] = mapped_column(String(10), default="")  # male | female | other
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    activity: Mapped[str] = mapped_column(String(12), default="light")  # sedentary|light|moderate|active
    goals: Mapped[list] = mapped_column(JSON, default=list)
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    contacts: Mapped[list["Contact"]] = relationship(cascade="all, delete-orphan")
    episodes: Mapped[list["Episode"]] = relationship(cascade="all, delete-orphan")
    logs: Mapped[list["DailyLog"]] = relationship(cascade="all, delete-orphan")


class Contact(Base):
    __tablename__ = "contacts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(10))  # family | doctor
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20))
    relation: Mapped[str] = mapped_column(String(120), default="")  # relation or clinic
    caregiver_alerts: Mapped[bool] = mapped_column(Boolean, default=False)  # opt-in


class Episode(Base):
    __tablename__ = "episodes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50))
    issue_description: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[date] = mapped_column(Date, default=date.today)
    status: Mapped[str] = mapped_column(String(10), default="active")  # active | closed

    consultations: Mapped[list["Consultation"]] = relationship(cascade="all, delete-orphan")


class Consultation(Base):
    __tablename__ = "consultations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    episode_id: Mapped[str] = mapped_column(ForeignKey("episodes.id", ondelete="CASCADE"), index=True)
    consent_given: Mapped[bool] = mapped_column(Boolean, default=False)
    language: Mapped[str] = mapped_column(String(10), default="")
    duration_sec: Mapped[float] = mapped_column(default=0.0)
    # [{"start": 12.3, "end": 15.8, "text": "..."}] — timestamps power the evidence links
    transcript: Mapped[list] = mapped_column(JSON, default=list)
    summary: Mapped[str] = mapped_column(Text, default="")  # filled in week 4
    audio_deleted: Mapped[bool] = mapped_column(Boolean, default=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class DailyLog(Base):
    """One row per user per day: the fitness-tracker side (water, steps, sleep, mood)."""
    __tablename__ = "daily_logs"
    __table_args__ = (UniqueConstraint("user_id", "day"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    water_ml: Mapped[int] = mapped_column(Integer, default=0)
    steps: Mapped[int] = mapped_column(Integer, default=0)
    sleep_hours: Mapped[float] = mapped_column(Float, default=0.0)
    mood: Mapped[str] = mapped_column(String(10), default="")  # great|good|okay|low


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    action: Mapped[str] = mapped_column(String(20))
    resource: Mapped[str] = mapped_column(String(200))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
