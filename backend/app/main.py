from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import Base, engine
from app.routers import auth, consultations, contacts, episodes, profile

# Creates tables on startup (fine for development; add Alembic migrations later).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ConsultKeeper API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(contacts.router)
app.include_router(episodes.router)
app.include_router(consultations.router)
