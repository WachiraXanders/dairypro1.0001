from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from .. import models

router = APIRouter(prefix="/api/entities", tags=["entities"])

# The 19 logical collections that used to be Base44 entities. Kept as an
# allow-list so a typo in the frontend doesn't silently create a new table.
ENTITY_TYPES = {
    "Cattle", "CattleGroup", "MilkProduction", "HealthRecord", "BreedingRecord",
    "Inventory", "ConsumptionRecord", "StockAdjustment", "ScheduledFeedRatio",
    "FeedRatio", "ShoppingList", "Task", "Transaction", "Vendor",
    "CategorySettings", "MilkPrice", "MilkYieldAlert", "DashboardSettings",
    "Settings",
}

# Entities that hold farm-wide configuration rather than per-record data —
# writes are restricted to admins/managers.
ADMIN_WRITE_ENTITIES = {"Settings", "MilkPrice", "CategorySettings"}


def _check_entity(entity_type: str):
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(status_code=404, detail=f"Unknown entity '{entity_type}'")


def serialize(rec: models.Record) -> dict:
    out = dict(rec.data or {})
    out["id"] = rec.id
    out["created_date"] = rec.created_date.isoformat() if rec.created_date else None
    out["updated_date"] = rec.updated_date.isoformat() if rec.updated_date else None
    out["created_by_id"] = rec.created_by_id
    out["created_by"] = rec.created_by_email
    return out


@router.get("/{entity_type}")
def list_records(
    entity_type: str,
    sort: str | None = Query(default=None),
    limit: int = Query(default=1000, le=5000),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    _check_entity(entity_type)
    q = db.query(models.Record).filter(models.Record.entity_type == entity_type)

    if sort:
        desc = sort.startswith("-")
        field = sort[1:] if desc else sort
        if field == "created_date":
            order_col = models.Record.created_date
        else:
            order_col = func.json_extract(models.Record.data, f"$.{field}")
        q = q.order_by(order_col.desc() if desc else order_col.asc())
    else:
        q = q.order_by(models.Record.created_date.desc())

    records = q.limit(limit).all()
    return [serialize(r) for r in records]


@router.get("/{entity_type}/{record_id}")
def get_record(entity_type: str, record_id: str, db: Session = Depends(get_db), _user=Depends(get_current_user)):
    _check_entity(entity_type)
    rec = db.query(models.Record).filter(
        models.Record.entity_type == entity_type, models.Record.id == record_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize(rec)


@router.post("/{entity_type}")
def create_record(
    entity_type: str,
    body: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _check_entity(entity_type)
    if entity_type in ADMIN_WRITE_ENTITIES and user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    rec = models.Record(
        entity_type=entity_type,
        data=body,
        created_by_id=user.id,
        created_by_email=user.email,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return serialize(rec)


@router.put("/{entity_type}/{record_id}")
def update_record(
    entity_type: str,
    record_id: str,
    body: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _check_entity(entity_type)
    if entity_type in ADMIN_WRITE_ENTITIES and user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    rec = db.query(models.Record).filter(
        models.Record.entity_type == entity_type, models.Record.id == record_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    merged = dict(rec.data or {})
    merged.update(body)
    rec.data = merged
    db.commit()
    db.refresh(rec)
    return serialize(rec)


@router.delete("/{entity_type}/{record_id}")
def delete_record(
    entity_type: str,
    record_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _check_entity(entity_type)
    rec = db.query(models.Record).filter(
        models.Record.entity_type == entity_type, models.Record.id == record_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(rec)
    db.commit()
    return {"ok": True}
