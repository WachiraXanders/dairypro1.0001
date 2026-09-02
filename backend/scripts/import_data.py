"""
One-time bulk import: load a CSV or Excel file straight into a DairyPro
entity, bypassing the API. Meant for backfilling historical records.

Setup (once):
    cd backend
    source venv/bin/activate
    pip install pandas openpyxl

Usage:
    python scripts/import_data.py \
        --file ../data/cattle_history.csv \
        --entity-type Cattle \
        --user-email you@farm.com

    # Excel with a specific sheet:
    python scripts/import_data.py \
        --file ../data/records.xlsx \
        --sheet "Milk 2024" \
        --entity-type MilkProduction \
        --user-email you@farm.com

    # Preview only — parses and validates, prints the first 5 rows, writes nothing:
    python scripts/import_data.py --file ... --entity-type Cattle --dry-run

How column mapping works:
    Your file's column headers become the field names on the entity, so they
    need to match what the app expects (see base44/entities/<Entity>.jsonc
    equivalents in the migration audit, or just check what an existing record
    looks like via GET /api/entities/<EntityType> in Swagger). Rename your
    spreadsheet headers to match — e.g. for Cattle: tag_number, name, breed,
    gender, status, date_of_birth, weight_kg, ...

    Empty cells are dropped (not stored as empty strings) so they don't
    overwrite sensible defaults. Numeric-looking values are coerced to
    int/float; everything else stays a string. Dates should already be in
    YYYY-MM-DD text form in your file — this script does not reformat dates.
"""

import argparse
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal  # noqa: E402
from app.models import Record, User  # noqa: E402

VALID_ENTITY_TYPES = {
    "Cattle", "CattleGroup", "MilkProduction", "HealthRecord", "BreedingRecord",
    "Inventory", "ConsumptionRecord", "StockAdjustment", "ScheduledFeedRatio",
    "FeedRatio", "ShoppingList", "Task", "Transaction", "Vendor",
    "CategorySettings", "MilkPrice", "MilkYieldAlert", "DashboardSettings",
    "Settings",
}


def coerce(value):
    """Turn pandas/openpyxl values into clean JSON-safe Python values."""
    if value is None:
        return None
    # pandas NaN
    try:
        import math
        if isinstance(value, float) and math.isnan(value):
            return None
    except ImportError:
        pass
    if isinstance(value, str):
        value = value.strip()
        if value == "":
            return None
        if value.replace(".", "", 1).replace("-", "", 1).isdigit():
            return float(value) if "." in value else int(value)
        return value
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    return value


def load_rows(file_path, sheet=None):
    import pandas as pd

    if file_path.lower().endswith(".csv"):
        df = pd.read_csv(file_path, dtype=str)
    else:
        df = pd.read_excel(file_path, sheet_name=sheet or 0)

    rows = []
    for _, row in df.iterrows():
        cleaned = {}
        for col, val in row.items():
            coerced = coerce(val)
            if coerced is not None:
                cleaned[str(col).strip()] = coerced
        if cleaned:
            rows.append(cleaned)
    return rows


def main():
    parser = argparse.ArgumentParser(description="Bulk import a CSV/Excel file into a DairyPro entity.")
    parser.add_argument("--file", required=True, help="Path to the .csv or .xlsx file")
    parser.add_argument("--entity-type", required=True, choices=sorted(VALID_ENTITY_TYPES))
    parser.add_argument("--sheet", default=None, help="Excel sheet name (defaults to the first sheet)")
    parser.add_argument("--user-email", default=None, help="Attribute imported records to this existing user's email")
    parser.add_argument("--dry-run", action="store_true", help="Parse and preview only — writes nothing")
    args = parser.parse_args()

    rows = load_rows(args.file, args.sheet)
    print(f"Parsed {len(rows)} row(s) from {args.file}")

    if not rows:
        print("Nothing to import.")
        return

    print("\nFirst row preview:")
    for k, v in rows[0].items():
        print(f"  {k}: {v!r}")

    if args.dry_run:
        print("\nDry run — no data written. Re-run without --dry-run to import.")
        return

    db = SessionLocal()
    try:
        user = None
        if args.user_email:
            user = db.query(User).filter(User.email == args.user_email.lower()).first()
            if not user:
                print(f"WARNING: no user found with email {args.user_email} — records will be unattributed.")

        created = 0
        for row in rows:
            db.add(Record(
                entity_type=args.entity_type,
                data=row,
                created_by_id=user.id if user else None,
                created_by_email=user.email if user else None,
            ))
            created += 1
        db.commit()
        print(f"\nDone — imported {created} {args.entity_type} record(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
