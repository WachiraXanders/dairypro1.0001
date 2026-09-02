import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine, SessionLocal
from . import models
from .routers import auth, users, entities, integrations, analytics

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DairyPro API", version="1.0.0")

origins = os.environ.get("DAIRYPRO_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "var", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/files", StaticFiles(directory=UPLOAD_DIR), name="files")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(entities.router)
app.include_router(integrations.router)
app.include_router(analytics.router)


@app.on_event("startup")
def seed_defaults():
    db = SessionLocal()
    try:
        has_settings = db.query(models.Record).filter(models.Record.entity_type == "Settings").first()
        if not has_settings:
            db.add(models.Record(
                entity_type="Settings",
                data={
                    "farm_name": "My Dairy Farm",
                    "currency": "KES",
                    "currency_symbol": "KSh",
                    "location": "",
                    "phone": "",
                    "email": "",
                },
            ))
        defaults = [
            ("inventory", ["Feed", "Medicine", "Supplement", "Equipment", "Supplies", "Other"]),
            ("finance_income", ["Milk Sales", "Cattle Sales", "Other"]),
            ("finance_expense", ["Feed", "Medicine", "Veterinary", "Labor", "Equipment", "Utilities", "Transportation", "Other"]),
        ]
        has_categories = db.query(models.Record).filter(models.Record.entity_type == "CategorySettings").first()
        if not has_categories:
            for context, names in defaults:
                for name in names:
                    db.add(models.Record(entity_type="CategorySettings", data={"context": context, "name": name, "is_default": True}))
        db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
