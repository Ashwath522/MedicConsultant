from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

TIME = r"^([01]\d|2[0-3]):[0-5]\d$"


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    token: str


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    name: str
    age: int | None
    language: str
    allergies: list[str]
    chronic_conditions: list[str]
    regular_medicines: list[str]
    wake_time: str
    breakfast_time: str
    lunch_time: str
    dinner_time: str
    bed_time: str


class ProfileUpdate(BaseModel):
    name: str | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    language: str | None = None
    allergies: list[str] | None = None
    chronic_conditions: list[str] | None = None
    regular_medicines: list[str] | None = None
    wake_time: str | None = Field(default=None, pattern=TIME)
    breakfast_time: str | None = Field(default=None, pattern=TIME)
    lunch_time: str | None = Field(default=None, pattern=TIME)
    dinner_time: str | None = Field(default=None, pattern=TIME)
    bed_time: str | None = Field(default=None, pattern=TIME)


class ContactIn(BaseModel):
    type: Literal["family", "doctor"]
    name: str = Field(min_length=1)
    phone: str = Field(min_length=5, max_length=20)
    relation: str = ""
    caregiver_alerts: bool = False


class ContactOut(ContactIn):
    model_config = ConfigDict(from_attributes=True)
    id: str


class SuggestIn(BaseModel):
    description: str = Field(min_length=3)


class SuggestOut(BaseModel):
    category: str
    title: str
    source: Literal["llm", "rules"]


class EpisodeIn(BaseModel):
    title: str = Field(min_length=1)
    category: str = Field(min_length=1)
    issue_description: str = ""
    start_date: date | None = None


class EpisodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    category: str
    issue_description: str
    start_date: date
    status: str
