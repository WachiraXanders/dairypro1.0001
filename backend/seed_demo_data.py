"""
DairyPro demo data seeder.

Populates a RUNNING backend (default http://localhost:8000) with a large,
realistic, cross-referenced dataset so every page and form in the app has
something to test against: cattle, groups, vendors, inventory, milk
production, health records, breeding records, stock adjustments, consumption
records, feed ratios, scheduled feeds, shopping list items, tasks, and
financial transactions.

Usage:
    cd backend
    source venv/bin/activate
    python seed_demo_data.py --email admin@farm.com --password test1234

    # bigger dataset:
    python seed_demo_data.py --email admin@farm.com --password test1234 --scale 2.0

    # against a deployed backend:
    python seed_demo_data.py --url https://your-api.example.com --email ... --password ...

The email/password is used to log in if the account already exists, or
register a new (first = admin) account if it doesn't. Everything is created
through the same REST API the frontend uses, so it exercises the exact same
code paths.
"""

import argparse
import random
import sys
from datetime import date, timedelta

try:
    import requests
except ImportError:
    print("This script needs the 'requests' package: pip install requests")
    sys.exit(1)

random.seed(42)  # reproducible dataset

CATTLE_BREEDS = ["Holstein", "Jersey", "Guernsey", "Ayrshire", "Brown Swiss", "Milking Shorthorn", "Crossbreed"]
FIRST_NAMES = [
    "Bella", "Daisy", "Rosie", "Molly", "Buttercup", "Clover", "Luna", "Star", "Maple", "Willow",
    "Hazel", "Ginger", "Ivy", "Pearl", "Poppy", "Sunny", "Winnie", "Bluebell", "Marigold", "Snowy",
    "Duke", "Titan", "Bruno", "Rex", "Diesel",
]

VENDOR_NAMES = [
    ("Green Valley Feeds Ltd", "Feed Supplier"), ("Kenchic Agrovet", "Medicine & Vet"),
    ("Farmers Choice Supplies", "Feed Supplier"), ("VetCare Kenya", "Medicine & Vet"),
    ("DeLaval Equipment", "Equipment"), ("Rift Valley Millers", "Feed Supplier"),
    ("AgriMed Distributors", "Medicine & Vet"), ("PowerGen Utilities", "Utilities"),
    ("Highlands Transport Co", "Services"), ("Nyeri Feed Mills", "Feed Supplier"),
    ("Cool Chain Equipment", "Equipment"), ("Prime Vet Supplies", "Medicine & Vet"),
]

INVENTORY_ITEMS = [
    ("Dairy Meal", "Feed", 70), ("Maize Germ", "Feed", 50), ("Hay Bales", "Feed", 20),
    ("Molasses", "Feed", 25), ("Mineral Lick Blocks", "Supplement", 5), ("Calf Starter Feed", "Feed", 25),
    ("Silage", "Feed", 500), ("Cotton Seed Cake", "Feed", 50),
    ("Penicillin Injectable", "Medicine", 1), ("Oxytetracycline", "Medicine", 1),
    ("Dewormer (Albendazole)", "Medicine", 1), ("Mastitis Treatment Tubes", "Medicine", 1),
    ("Foot Rot Spray", "Medicine", 1), ("Vitamin B Complex", "Supplement", 1),
    ("Calcium Borogluconate", "Medicine", 1), ("Iodine Solution", "Medicine", 1),
    ("Teat Dip", "Supplement", 5), ("Milking Machine Liners", "Equipment", 1),
    ("Milk Cans (20L)", "Equipment", 20), ("AI Straws - Holstein", "Supplies", 1),
    ("AI Straws - Jersey", "Supplies", 1), ("Ear Tags", "Supplies", 1),
    ("Disinfectant (Farm Grade)", "Supplies", 25), ("Gumboots", "Equipment", 1),
    ("Overalls", "Equipment", 1),
]

GROUPS = [
    ("Milking Herd", "Active lactating cows"),
    ("Dry Cows", "Cows in the dry period before calving"),
    ("Heifers", "Young females not yet calved"),
    ("Calves", "Calves under 6 months"),
    ("Bulls", "Breeding bulls"),
    ("Sick Bay", "Animals under veterinary observation"),
]

HEALTH_TYPES = ["Vaccination", "Treatment", "Checkup", "Surgery", "Deworming", "Injury", "Illness", "Other"]
HEALTH_DIAGNOSES = [
    "Mastitis", "Foot rot", "Bloat", "Retained placenta", "Milk fever", "Ketosis",
    "Respiratory infection", "Lameness", "Eye infection", "Routine deworming", "Annual vaccination",
]
TASK_TITLES = [
    "Morning milking round", "Evening milking round", "Clean milking parlour", "Vaccinate calves",
    "Order more dairy meal", "Repair fence - north paddock", "Deworm heifers", "Hoof trimming session",
    "Check water troughs", "Service milking machine", "Restock first aid kit", "AI technician visit",
    "Pregnancy check - dry cows", "Weigh calves", "Clean water tanks", "Spray for flies",
]
VENDOR_TERMS = ["Cash", "Net 7", "Net 14", "Net 30", "Net 60"]


def d(days_ago):
    return (date.today() - timedelta(days=days_ago)).isoformat()


def month_str(months_ago):
    dt = date.today().replace(day=1)
    y, m = dt.year, dt.month - months_ago
    while m <= 0:
        m += 12
        y -= 1
    return f"{y:04d}-{m:02d}"


class Seeder:
    def __init__(self, base_url, scale):
        self.base_url = base_url.rstrip("/")
        self.scale = scale
        self.session = requests.Session()
        self.counts = {}

    def _n(self, base):
        return max(1, int(base * self.scale))

    def auth(self, email, password, full_name):
        r = self.session.post(f"{self.base_url}/api/auth/login", json={"email": email, "password": password})
        if r.status_code == 200:
            print(f"Logged in as {email}")
        else:
            r = self.session.post(
                f"{self.base_url}/api/auth/register",
                json={"email": email, "password": password, "full_name": full_name},
            )
            r.raise_for_status()
            print(f"Registered and logged in as {email}")
        token = r.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def create(self, entity, payload):
        r = self.session.post(f"{self.base_url}/api/entities/{entity}", json=payload)
        r.raise_for_status()
        self.counts[entity] = self.counts.get(entity, 0) + 1
        return r.json()

    def update(self, entity, record_id, payload):
        r = self.session.put(f"{self.base_url}/api/entities/{entity}/{record_id}", json=payload)
        r.raise_for_status()
        return r.json()

    # ---- seed sections -------------------------------------------------

    def seed_settings(self):
        r = self.session.get(f"{self.base_url}/api/entities/Settings")
        r.raise_for_status()
        existing = r.json()
        payload = {
            "farm_name": "Green Valley Dairy Farm",
            "currency": "KES",
            "currency_symbol": "KSh",
            "location": "Nyeri County, Kenya",
            "phone": "+254712345678",
            "email": "manager@greenvalleydairy.co.ke",
        }
        if existing:
            self.update("Settings", existing[0]["id"], payload)
        else:
            self.create("Settings", payload)
        print("Settings configured")

    def seed_vendors(self):
        vendors = []
        for name, category in VENDOR_NAMES:
            v = self.create("Vendor", {
                "name": name,
                "category": category,
                "contact_person": random.choice(["James M.", "Grace W.", "Peter K.", "Mary N.", "John O."]),
                "phone": f"+2547{random.randint(10000000, 99999999)}",
                "email": name.lower().replace(" ", "").replace(".", "")[:20] + "@example.com",
                "payment_terms": random.choice(VENDOR_TERMS),
                "status": "Active" if random.random() > 0.1 else "Inactive",
                "address": f"P.O. Box {random.randint(100,9999)}, Nyeri",
            })
            vendors.append(v)
        print(f"Vendors: {len(vendors)}")
        return vendors

    def seed_inventory(self, vendors):
        items = []
        for name, category, kg_per_pkg in INVENTORY_ITEMS:
            pkg_qty = random.randint(5, 40)
            total_kg = round(pkg_qty * kg_per_pkg, 1)
            reorder = round(total_kg * random.uniform(0.15, 0.4), 1)
            vendor = random.choice([v for v in vendors if v["category"] in ("Feed Supplier", "Medicine & Vet", "Equipment")] or vendors)
            item = self.create("Inventory", {
                "name": name,
                "category": category,
                "package_quantity": pkg_qty,
                "package_unit": random.choice(["bags", "boxes", "bottles", "pieces", "sacks"]),
                "kg_per_package": kg_per_pkg,
                "total_quantity_kg": total_kg,
                "reorder_level": reorder,
                "cost_per_kg": round(random.uniform(20, 250), 2),
                "purchase_date": d(random.randint(5, 90)),
                "supplier": vendor["name"],
                "vendor_id": vendor["id"],
                "vendor_name": vendor["name"],
                "location": random.choice(["Main Store", "Feed Shed", "Clinic Cabinet", "Equipment Room"]),
                "notes": "",
            })
            items.append(item)
        print(f"Inventory items: {len(items)}")
        return items

    def seed_groups(self):
        groups = []
        for name, desc in GROUPS:
            groups.append(self.create("CattleGroup", {"name": name, "description": desc}))
        print(f"Cattle groups: {len(groups)}")
        return groups

    def seed_cattle(self, groups):
        n = self._n(50)
        cattle = []
        female_group = next(g for g in groups if g["name"] == "Milking Herd")
        heifer_group = next(g for g in groups if g["name"] == "Heifers")
        bull_group = next(g for g in groups if g["name"] == "Bulls")
        calf_group = next(g for g in groups if g["name"] == "Calves")

        for i in range(1, n + 1):
            tag = str(i).zfill(3)
            gender = "Female" if random.random() < 0.85 else "Male"
            age_days = random.randint(60, 365 * 7)
            is_calf = age_days < 240
            if gender == "Male":
                status = "Active"
                group = calf_group["name"] if is_calf else bull_group["name"]
                stage = "Calf" if is_calf else "Bull"
            else:
                if is_calf:
                    status, group, stage = "Active", calf_group["name"], "Calf"
                elif age_days < 550:
                    status, group, stage = "Active", heifer_group["name"], "Heifer"
                else:
                    status = random.choices(
                        ["Active", "Dry", "Pregnant", "Sold", "Deceased"],
                        weights=[55, 15, 20, 7, 3],
                    )[0]
                    group = female_group["name"] if status in ("Active", "Pregnant") else "Dry Cows"
                    stage = "Mature Cow"

            cattle.append(self.create("Cattle", {
                "tag_number": tag,
                "name": random.choice(FIRST_NAMES) if random.random() > 0.15 else "",
                "breed": random.choice(CATTLE_BREEDS),
                "gender": gender,
                "status": status,
                "date_of_birth": d(age_days),
                "weight_kg": round(random.uniform(35, 650), 1),
                "acquisition_date": d(age_days if random.random() > 0.2 else random.randint(0, age_days)),
                "acquisition_type": random.choices(["Born on Farm", "Purchased", "Gifted"], weights=[70, 25, 5])[0],
                "group_name": group,
                "stage": stage,
                "lactation_number": random.randint(0, 5) if not is_calf and gender == "Female" else 0,
                "sire_id": "",
                "dam_id": "",
                "notes": "",
            }))
        print(f"Cattle: {len(cattle)}")
        return cattle

    def seed_milk_prices(self):
        prices = []
        base_price = 45
        for i in range(24, -1, -1):
            price = round(base_price + random.uniform(-6, 8), 2)
            prices.append(self.create("MilkPrice", {"month": month_str(i), "price_per_liter": price}))
        print(f"Milk prices: {len(prices)}")
        return prices

    def seed_milk_production(self, cattle):
        milking_cattle = [c for c in cattle if c["gender"] == "Female" and c["status"] in ("Active", "Pregnant")]
        days = self._n(60)
        count = 0
        for day_offset in range(days):
            date_str = d(day_offset)
            for cow in milking_cattle:
                # not every cow milked every session — some randomness
                for session in ["Morning", "Evening"]:
                    if random.random() < 0.92:
                        qty = round(random.uniform(6, 28), 1)
                        self.create("MilkProduction", {
                            "date": date_str,
                            "cattle_tag": cow["tag_number"],
                            "session": session,
                            "quantity_liters": qty,
                            "milk_used_by_calves": round(random.uniform(0, 2), 1) if random.random() < 0.2 else 0,
                            "fat_percentage": round(random.uniform(3.2, 5.0), 2),
                            "protein_percentage": round(random.uniform(2.8, 3.6), 2),
                            "quality_grade": random.choices(["A", "B", "C"], weights=[75, 20, 5])[0],
                            "notes": "",
                        })
                        count += 1
        print(f"Milk production records: {count}")

    def seed_health_records(self, cattle):
        n = self._n(150)
        for _ in range(n):
            cow = random.choice(cattle)
            record_type = random.choice(HEALTH_TYPES)
            has_cost = record_type in ("Treatment", "Surgery", "Vaccination", "Deworming")
            self.create("HealthRecord", {
                "cattle_id": cow["id"],
                "cattle_tag": cow["tag_number"],
                "date": d(random.randint(0, 180)),
                "record_type": record_type,
                "diagnosis": random.choice(HEALTH_DIAGNOSES) if record_type in ("Treatment", "Illness", "Checkup") else "",
                "treatment": "Administered per protocol" if has_cost else "",
                "medication": random.choice(["Penicillin", "Oxytetracycline", "Albendazole", ""]) if has_cost else "",
                "dosage": "10ml 2x daily" if has_cost else "",
                "veterinarian": random.choice(["Dr. Kamau", "Dr. Wanjiru", "Dr. Otieno", ""]),
                "cost": round(random.uniform(300, 4500), 2) if has_cost else None,
                "follow_up_date": d(-random.randint(3, 21)) if random.random() < 0.2 else "",
                "status": random.choices(["Resolved", "Ongoing", "Monitoring"], weights=[70, 15, 15])[0],
                "notes": "",
            })
        print(f"Health records: {n}")

    def seed_breeding_records(self, cattle):
        females = [c for c in cattle if c["gender"] == "Female" and c["stage"] != "Calf"]
        count = 0
        for cow in females:
            for _ in range(random.randint(0, 2)):
                breeding_date = d(random.randint(30, 500))
                outcome = random.choices(
                    ["Pending", "Successful", "Stillborn", "Assisted", "C-Section"],
                    weights=[25, 55, 5, 10, 5],
                )[0]
                pregnancy_status = "Confirmed" if outcome != "Pending" else random.choice(["Pending", "Confirmed", "Not Pregnant"])
                self.create("BreedingRecord", {
                    "cattle_id": cow["id"],
                    "cattle_tag": cow["tag_number"],
                    "breeding_date": breeding_date,
                    "breeding_type": random.choices(["Artificial Insemination", "Natural"], weights=[70, 30])[0],
                    "sire_info": f"AI-{random.randint(1000,9999)}" if random.random() > 0.3 else "Farm Bull",
                    "sire_breed": random.choice(CATTLE_BREEDS),
                    "technician": random.choice(["James K.", "Alice M.", ""]),
                    "heat_detected_date": "",
                    "pregnancy_check_date": "",
                    "pregnancy_status": pregnancy_status,
                    "expected_calving_date": "",
                    "actual_calving_date": d(random.randint(0, 200)) if outcome not in ("Pending",) and random.random() > 0.4 else "",
                    "calving_outcome": outcome,
                    "calf_gender": random.choice(["Male", "Female"]) if outcome == "Successful" else "",
                    "cost": round(random.uniform(500, 3000), 2) if random.random() > 0.4 else None,
                    "notes": "",
                })
                count += 1
        print(f"Breeding records: {count}")

    def seed_stock_adjustments(self, inventory):
        n = self._n(80)
        for _ in range(n):
            item = random.choice(inventory)
            change = round(random.uniform(20, 300), 1)
            adj_type = random.choices(["Purchase", "Waste", "Transfer", "Adjustment"], weights=[70, 10, 10, 10])[0]
            self.create("StockAdjustment", {
                "inventory_id": item["id"],
                "item_name": item["name"],
                "adjustment_type": adj_type,
                "quantity_change": change if adj_type == "Purchase" else -change,
                "previous_quantity": item["total_quantity_kg"],
                "new_quantity": round(item["total_quantity_kg"] + (change if adj_type == "Purchase" else -change), 1),
                "date": d(random.randint(1, 180)),
                "cost": round(change * item.get("cost_per_kg", 50), 2) if adj_type == "Purchase" else None,
                "reason": "Restock delivery" if adj_type == "Purchase" else "Routine adjustment",
                "reference": f"PO-{random.randint(10000,99999)}" if adj_type == "Purchase" else "",
                "notes": "",
            })
        print(f"Stock adjustments: {n}")

    def seed_consumption_records(self, inventory, groups):
        feed_items = [i for i in inventory if i["category"] in ("Feed", "Supplement")]
        if not feed_items:
            return
        n = self._n(60)
        for _ in range(n):
            item = random.choice(feed_items)
            group = random.choice(groups)
            qty = round(random.uniform(30, 200), 1)
            head_count = random.randint(5, 40)
            self.create("ConsumptionRecord", {
                "date": d(random.randint(0, 120)),
                "inventory_id": item["id"],
                "item_name": item["name"],
                "group_id": group["id"],
                "group_name": group["name"],
                "quantity_kg": qty,
                "head_count": head_count,
                "kg_per_head": round(qty / head_count, 2),
                "cost_per_kg": item.get("cost_per_kg"),
                "total_cost": round(qty * (item.get("cost_per_kg") or 0), 2),
                "stock_before_kg": item["total_quantity_kg"],
                "stock_after_kg": round(item["total_quantity_kg"] - qty, 1),
                "recorded_by": random.choice(["James", "Grace", "Peter", ""]),
                "notes": "",
            })
        print(f"Consumption records: {n}")

    def seed_feed_ratios(self, cattle, inventory):
        feed_items = [i for i in inventory if i["category"] in ("Feed", "Supplement")]
        if not feed_items:
            return
        milking_cattle = [c for c in cattle if c["status"] == "Active"]
        n = self._n(100)
        for _ in range(n):
            cow = random.choice(milking_cattle)
            item = random.choice(feed_items)
            qty = round(random.uniform(2, 12), 1)
            self.create("FeedRatio", {
                "cattle_id": cow["id"],
                "cattle_tag": cow["tag_number"],
                "cattle_name": cow.get("name", ""),
                "date": d(random.randint(0, 60)),
                "inventory_id": item["id"],
                "feed_name": item["name"],
                "feed_amount_kg": qty,
                "cost_per_kg": item.get("cost_per_kg"),
                "total_cost": round(qty * (item.get("cost_per_kg") or 0), 2),
                "remaining_inventory_kg": item["total_quantity_kg"],
                "notes": "",
            })
        print(f"Feed ratio entries: {n}")

    def seed_scheduled_feeds(self, cattle, inventory):
        feed_items = [i for i in inventory if i["category"] == "Feed"]
        if not feed_items:
            return
        n = self._n(8)
        candidates = [c for c in cattle if c["status"] == "Active"]
        for _ in range(n):
            cow = random.choice(candidates)
            item = random.choice(feed_items)
            self.create("ScheduledFeedRatio", {
                "cattle_id": cow["id"],
                "cattle_tag": cow["tag_number"],
                "cattle_name": cow.get("name", ""),
                "inventory_id": item["id"],
                "feed_name": item["name"],
                "feed_amount_kg": round(random.uniform(3, 10), 1),
                "start_date": d(random.randint(0, 10)),
                "end_date": (date.today() + timedelta(days=random.randint(30, 120))).isoformat(),
                "active": True,
                "last_processed_date": "",
            })
        print(f"Scheduled feed ratios: {n}")

    def seed_shopping_list(self, inventory):
        low_stock = [i for i in inventory if i["total_quantity_kg"] <= i["reorder_level"] * 1.3][:8]
        for item in low_stock:
            ratio = item["total_quantity_kg"] / max(item["reorder_level"], 1)
            priority = "Critical" if ratio <= 0.25 else "High" if ratio <= 0.5 else "Medium"
            self.create("ShoppingList", {
                "inventory_id": item["id"],
                "item_name": item["name"],
                "category": item["category"],
                "current_stock_kg": item["total_quantity_kg"],
                "reorder_level_kg": item["reorder_level"],
                "suggested_quantity_kg": round(item["reorder_level"] * 2, 1),
                "estimated_cost": round(item["reorder_level"] * 2 * (item.get("cost_per_kg") or 0), 2),
                "supplier": item.get("supplier", ""),
                "priority": priority,
                "status": "Pending",
                "auto_generated": True,
            })
        print(f"Shopping list items: {len(low_stock)}")

    def seed_tasks(self):
        n = self._n(40)
        for _ in range(n):
            due_offset = random.randint(-20, 30)
            status = "Completed" if due_offset < -2 and random.random() < 0.7 else random.choices(
                ["Pending", "In Progress", "Overdue"], weights=[60, 25, 15]
            )[0]
            self.create("Task", {
                "title": random.choice(TASK_TITLES),
                "category": random.choice(["Milking", "Vaccination", "Cleaning", "Feeding", "Health Check", "Breeding", "Maintenance", "Other"]),
                "assigned_to": random.choice(["James", "Grace", "Peter", "Mary", ""]),
                "due_date": d(-due_offset),
                "priority": random.choices(["Low", "Medium", "High", "Urgent"], weights=[25, 40, 25, 10])[0],
                "status": status,
                "recurrence": random.choices(["None", "Daily", "Weekly", "Monthly"], weights=[60, 20, 15, 5])[0],
                "description": "",
            })
        print(f"Tasks: {n}")

    def seed_transactions(self, vendors, milk_prices):
        n = self._n(120)
        income_categories = ["Milk Sales", "Cattle Sales", "Other"]
        expense_categories = ["Feed", "Medicine", "Veterinary", "Labor", "Equipment", "Utilities", "Transportation", "Other"]
        for _ in range(n):
            is_income = random.random() < 0.35
            vendor = random.choice(vendors) if not is_income and random.random() < 0.6 else None
            self.create("Transaction", {
                "type": "Income" if is_income else "Expense",
                "category": random.choice(income_categories) if is_income else random.choice(expense_categories),
                "amount": round(random.uniform(500, 25000), 2),
                "date": d(random.randint(0, 180)),
                "payment_method": random.choice(["Cash", "Bank Transfer", "Check", "Mobile Money", "Other"]),
                "vendor_name": vendor["name"] if vendor else "",
                "vendor_id": vendor["id"] if vendor else "",
                "reference": f"REF-{random.randint(1000,9999)}",
                "description": "",
            })

        # A batch of explicit Milk Sales income transactions tied to actual prices,
        # so the Finance summary and P&L have real milk-income history to show.
        for i in range(min(len(milk_prices), self._n(12))):
            price = milk_prices[i]
            liters = round(random.uniform(800, 3000), 1)
            self.create("Transaction", {
                "type": "Income",
                "category": "Milk Sales",
                "amount": round(liters * price["price_per_liter"], 2),
                "date": f"{price['month']}-15",
                "payment_method": "Bank Transfer",
                "vendor_name": "",
                "vendor_id": "",
                "reference": f"MILK-BULK-{price['month']}",
                "description": f"Bulk milk sale — {liters}L @ {price['price_per_liter']}/L",
            })
        print(f"Transactions: ~{n + min(len(milk_prices), self._n(12))}")

    def seed_extra_users(self):
        for email, name, role in [
            ("manager@greenvalleydairy.co.ke", "Grace Wanjiru", "manager"),
            ("staff1@greenvalleydairy.co.ke", "Peter Kamau", "staff"),
            ("vet@greenvalleydairy.co.ke", "Dr. Otieno", "viewer"),
        ]:
            r = self.session.post(f"{self.base_url}/api/users/invite", json={"email": email, "full_name": name, "role": role})
            if r.status_code == 200:
                print(f"Invited {email} ({role})")


def main():
    parser = argparse.ArgumentParser(description="Seed the DairyPro backend with a large test dataset")
    parser.add_argument("--url", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--email", required=True, help="Login/register email (becomes admin if first user)")
    parser.add_argument("--password", required=True, help="Password (min 6 chars)")
    parser.add_argument("--full-name", default="Farm Admin", help="Full name if registering")
    parser.add_argument("--scale", type=float, default=1.0, help="Multiplier for volume of generated records (e.g. 2.0 = double)")
    args = parser.parse_args()

    seeder = Seeder(args.url, args.scale)
    try:
        seeder.auth(args.email, args.password, args.full_name)
    except requests.RequestException as e:
        print(f"Could not reach {args.url} — is the backend running? ({e})")
        sys.exit(1)

    seeder.seed_settings()
    seeder.seed_extra_users()
    vendors = seeder.seed_vendors()
    inventory = seeder.seed_inventory(vendors)
    groups = seeder.seed_groups()
    cattle = seeder.seed_cattle(groups)
    milk_prices = seeder.seed_milk_prices()
    seeder.seed_milk_production(cattle)
    seeder.seed_health_records(cattle)
    seeder.seed_breeding_records(cattle)
    seeder.seed_stock_adjustments(inventory)
    seeder.seed_consumption_records(inventory, groups)
    seeder.seed_feed_ratios(cattle, inventory)
    seeder.seed_scheduled_feeds(cattle, inventory)
    seeder.seed_shopping_list(inventory)
    seeder.seed_tasks()
    seeder.seed_transactions(vendors, milk_prices)

    print("\n--- Done ---")
    for entity, count in sorted(seeder.counts.items()):
        print(f"{entity:20s} {count}")
    print(f"\nLog in at the frontend with {args.email} / (the password you passed in)")


if __name__ == "__main__":
    main()
