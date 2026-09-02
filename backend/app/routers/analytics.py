from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from .. import models
from ..integrations import invoke_llm

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _records(db: Session, entity_type: str):
    rows = db.query(models.Record).filter(models.Record.entity_type == entity_type).all()
    out = []
    for r in rows:
        d = dict(r.data or {})
        d["id"] = r.id
        d["created_date"] = r.created_date.isoformat() if r.created_date else None
        out.append(d)
    return out


def _linear_trend(points: list[float]) -> tuple[float, float]:
    """Least-squares slope/intercept over evenly spaced points (x = 0..n-1)."""
    n = len(points)
    if n < 2:
        return 0.0, (points[0] if points else 0.0)
    xs = list(range(n))
    x_mean = sum(xs) / n
    y_mean = sum(points) / n
    num = sum((xs[i] - x_mean) * (points[i] - y_mean) for i in range(n))
    den = sum((xs[i] - x_mean) ** 2 for i in range(n)) or 1
    slope = num / den
    intercept = y_mean - slope * x_mean
    return slope, intercept


@router.get("/milk-forecast")
def milk_forecast(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    records = _records(db, "MilkProduction")
    monthly = defaultdict(float)
    for r in records:
        date = r.get("date")
        if not date:
            continue
        month = date[:7]
        monthly[month] += float(r.get("quantity_liters") or 0)

    months = sorted(monthly.keys())[-12:]
    series = [{"month": m, "total_liters": round(monthly[m], 1)} for m in months]
    values = [monthly[m] for m in months]
    slope, intercept = _linear_trend(values)
    next_value = max(0.0, slope * len(values) + intercept)

    trend = "stable"
    if slope > 0.5:
        trend = "rising"
    elif slope < -0.5:
        trend = "declining"

    return {
        "history": series,
        "forecast_next_month_liters": round(next_value, 1),
        "trend": trend,
        "monthly_change_liters": round(slope, 1),
    }


@router.get("/health-risk")
def health_risk(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    cattle = {c["id"]: c for c in _records(db, "Cattle")}
    health = _records(db, "HealthRecord")
    cutoff = (datetime.utcnow() - timedelta(days=90)).date().isoformat()

    per_cattle = defaultdict(list)
    for h in health:
        cid = h.get("cattle_id")
        if cid:
            per_cattle[cid].append(h)

    results = []
    for cid, c in cattle.items():
        if c.get("status") not in ("Active", "Pregnant", "Dry"):
            continue
        recs = per_cattle.get(cid, [])
        recent = [h for h in recs if (h.get("date") or "") >= cutoff]
        treatment_events = [h for h in recent if h.get("record_type") in ("Treatment", "Injury", "Surgery")]
        score = 100 - min(80, len(treatment_events) * 20) - min(15, max(0, len(recent) - treatment_events.__len__()) * 2)
        score = max(0, min(100, score))
        level = "Low" if score >= 70 else ("Medium" if score >= 40 else "High")
        results.append({
            "cattle_id": cid,
            "tag_number": c.get("tag_number"),
            "name": c.get("name"),
            "score": score,
            "risk_level": level,
            "recent_events": len(recent),
            "recent_treatments": len(treatment_events),
        })

    results.sort(key=lambda r: r["score"])
    return {"cattle": results, "high_risk_count": sum(1 for r in results if r["risk_level"] == "High")}


@router.get("/breeding-optimizer")
def breeding_optimizer(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    cattle = {c["id"]: c for c in _records(db, "Cattle") if c.get("gender") == "Female"}
    breeding = _records(db, "BreedingRecord")

    last_event = {}
    for b in breeding:
        cid = b.get("cattle_id")
        if not cid:
            continue
        date = b.get("breeding_date") or b.get("date")
        if not date:
            continue
        if cid not in last_event or date > last_event[cid].get("breeding_date", ""):
            last_event[cid] = b

    recommendations = []
    today = datetime.utcnow().date()
    for cid, c in cattle.items():
        if c.get("status") not in ("Active", "Dry"):
            continue
        last = last_event.get(cid)
        if not last:
            recommendations.append({
                "cattle_id": cid, "tag_number": c.get("tag_number"), "name": c.get("name"),
                "recommendation": "No breeding history on file — evaluate for first breeding.",
                "priority": "Medium",
            })
            continue
        outcome = last.get("calving_outcome") or last.get("outcome")
        last_date_str = last.get("breeding_date") or last.get("date")
        try:
            last_date = datetime.fromisoformat(last_date_str).date()
            days_since = (today - last_date).days
        except (ValueError, TypeError):
            days_since = None
        if outcome == "Pending":
            continue
        if days_since is not None and days_since > 365:
            recommendations.append({
                "cattle_id": cid, "tag_number": c.get("tag_number"), "name": c.get("name"),
                "recommendation": f"Over {days_since} days since last breeding event — good candidate for re-breeding.",
                "priority": "High" if days_since > 450 else "Medium",
            })

    return {"recommendations": recommendations}


@router.get("/insights")
def insights(db: Session = Depends(get_db), user=Depends(get_current_user)):
    forecast = milk_forecast(db=db, _user=user)
    risk = health_risk(db=db, _user=user)
    breeding = breeding_optimizer(db=db, _user=user)

    summary_lines = [
        f"Milk yield trend is {forecast['trend']} ({forecast['monthly_change_liters']:+.1f} L/month), forecast next month: {forecast['forecast_next_month_liters']} L.",
        f"{risk['high_risk_count']} animal(s) currently flagged as high health risk.",
        f"{len(breeding['recommendations'])} animal(s) recommended for breeding review.",
    ]
    return {
        "summary": " ".join(summary_lines),
        "milk_forecast": forecast,
        "health_risk": risk,
        "breeding": breeding,
    }


@router.post("/ai-insights")
def ai_insights(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Optional richer narrative on top of /insights, using an LLM if configured."""
    base = insights(db=db, user=user)
    result = invoke_llm(
        prompt=f"Summarize this dairy farm's current status for a farm manager in 3-4 sentences, plain language, "
               f"actionable tone. Data: {base['summary']}",
        response_json_schema={"type": "object", "properties": {"narrative": {"type": "string"}}},
    )
    if result.get("_ai_unavailable"):
        return {**base, "narrative": base["summary"], "ai_enabled": False}
    return {**base, "narrative": result.get("narrative", base["summary"]), "ai_enabled": True}
