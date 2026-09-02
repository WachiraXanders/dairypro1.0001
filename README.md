# DairyPro — full-stack rebuild

This replaces the old Base44-hosted app with a FastAPI backend you run yourself
and a React frontend that talks to it. Two folders:

```
backend/    FastAPI + SQLite API
frontend/   React (Vite) app
android/    Native Android app (Kotlin + Jetpack Compose) — see android/README.md
```

## Important context

The original frontend export you gave me (`claude_zip_frontend.zip`) turned out
to be **truncated** — about 40 page/component files were cut off mid-function
(all around 25 lines), and their real logic had already been replaced by
empty stubs. Two entity schema files were also corrupted. So this isn't a
byte-for-byte restoration of your old code — it's a fresh implementation
covering the same 19 entities and the same feature areas described in your
migration audit (`10__5th_Wednesday_2026.md`), with my own UI/component
structure.

**Simplifications from the original, worth knowing about:**
- Every entity (Cattle, MilkProduction, HealthRecord, etc.) is stored in one
  generic `records` table (id, entity_type, data JSON, owner, timestamps)
  rather than 19 separate hand-modeled tables. This mirrors how Base44 itself
  stored schema-less entities, and made a full rebuild tractable — but if you
  want strict per-entity SQL tables with real foreign keys later, that's a
  natural next step.
- Records are farm-wide (any signed-in user can read all of them) rather than
  scoped to the record's creator — a shared farm dataset made more sense than
  literal per-user row isolation. Role-based **write** restrictions are
  enforced server-side (e.g. only admin/manager can edit Settings).
- `AIInsights` and `MilkTrendForecast` (under Predictive Analytics) still
  call an LLM exactly like the original, but through this app's own backend
  endpoint (`/api/integrations/invoke-llm`) instead of Base44. Set
  `ANTHROPIC_API_KEY` on the backend to enable them — without it they show a
  clear "not configured" message instead of failing silently.
- `FinancialForecast`'s scenario engine (`forecastEngine.js`) is a straight
  port of the original — pure math, no external dependency, works with or
  without an AI key.
- No drag-and-drop kanban boards from the original feature list. Everything
  else — Reports (7 tabs with CSV/PDF export), Predictive Analytics, feeding
  schedule automation, stock adjustments, consumption logging, shopping list
  auto-generation with email alerts, breeding calendar, cattle detail
  profiles, role matrix, offline logging — has been rebuilt from your actual
  source files.
- **Offline mode**: a minimal service worker (`public/sw.js`) caches static
  assets so the app shell still loads with no connection; an IndexedDB queue
  (`src/lib/offlineDb.js`) + sync engine (`src/lib/syncEngine.js`) queue
  writes made while offline and push them to the server automatically once
  back online (visible as a status pill at the bottom of the screen). The
  reusable `useOfflineEntity` hook exposes the same create/update/remove
  shape as the regular API client, and is wired into a global "Quick Log"
  sheet (milk + health entries — the two realistic field-use cases) reachable
  from that offline pill. Other pages' forms still talk to the API directly
  rather than through this hook — they'll simply show a failed-request error
  if used while offline, same as before. Swapping any of them onto
  `useOfflineEntity` for full offline CRUD is straightforward if you want it,
  since it mirrors the existing entity client's interface.
- `CattleGroup`, `MilkYieldAlert`, and `DashboardSettings` entities exist on
  the backend (full CRUD via the generic entities API) but don't have a
  dedicated management page yet — `CattleGroup` is used as a dropdown in the
  Inventory consumption form. Say the word if you want management UI for
  these.
- **Milk entry**: one unified `MilkProduction` page (not the original's
  separate ledger/dashboard/analytics trio) — logging captures all three
  sessions (Morning/Afternoon/Evening) for a cow in a single form, only
  saving whichever sessions actually have a quantity entered. The
  auto-created "Milk Sales" transaction logic lives in exactly one place
  (`MilkProduction.jsx`) and always uses **net liters** (quantity minus
  calf-used) — the original had this duplicated across two pages with
  inconsistent net-vs-raw math; that whole class of bug doesn't exist here
  since there's only one page doing it. A banner warns if no price is set
  for the current month, since that silently zeroes out milk income
  everywhere else in the app (Dashboard, Finance, forecasts).

## Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit if you want real email/AI
uvicorn app.main:app --reload --port 8000
```

The first person to register (see frontend) automatically becomes `admin`.
Everyone after that starts as `staff` (change roles from Settings → Users).

## Seeding a large test dataset

`backend/seed_demo_data.py` populates a **running** backend with a large,
cross-referenced dataset — cattle, groups, vendors, inventory, ~24 months of
milk prices, months of milk production, health records, breeding records,
stock adjustments, consumption logs, feed ratios, scheduled feeds, shopping
list items, tasks, and financial transactions — all created through the same
API the frontend uses, with real IDs linking records together (e.g. health
records reference actual cattle IDs, stock adjustments reference actual
inventory IDs).

```bash
cd backend
source venv/bin/activate
pip install requests   # only needed if not already installed
python seed_demo_data.py --email admin@farm.com --password test1234

# roughly double the volume of every entity:
python seed_demo_data.py --email admin@farm.com --password test1234 --scale 2.0
```

The email/password logs in if that account exists, or registers it (becomes
admin if it's the first account). Also invites three extra demo users
(manager, staff, viewer roles) so you can test role-based access — they'll
need to register with those exact emails to activate their accounts. Default
scale (`--scale 1.0`) generates on the order of 50 cattle, several thousand
milk production records, ~150 health records, ~80 stock adjustments, 25
inventory items, 120+ transactions, and more. It's idempotent-ish but not
fully — running it twice will create duplicate cattle/vendors/etc., so use a
fresh `dairypro.db` (or a different `--email`) if you want to reset.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env            # VITE_API_URL, defaults to http://localhost:8000
npm run dev
```

Open http://localhost:5173, click "First time here? Set up your farm", and
register your admin account.

## Deploying

- Backend: any host that runs a Python ASGI app (Render, Railway, Fly.io, a
  VPS with `uvicorn`/`gunicorn`). Swap the SQLite file for Postgres by
  changing `SQLALCHEMY_DATABASE_URL` in `backend/app/database.py` if you
  outgrow SQLite.
- Frontend: `npm run build` produces `frontend/dist` — deploy as a static
  site (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, etc.), and set
  `VITE_API_URL` to your deployed backend's URL at build time.

## Design system (latest pass)

DairyPro now runs on a token-based design system — Obsidian / Deep Forest /
Emerald / Gold / Ivory / Slate — rather than the earlier generic
slate-and-emerald look. Dark ("Obsidian") is the brand default; light is a
refined ivory alternative, toggleable from the sidebar. All colors flow
through CSS variables in `src/index.css`, so most of the app inherits the
new palette automatically via the shared shadcn `ui/` components.

New shared components in `src/components/shared/`: `PageHeader`, `KpiCard`,
`StatusBadge`, `EmptyState`, `ErrorState`, `LoadingSkeleton`.

**Update — full token conversion pass**: every remaining `text-slate-*`,
`bg-slate-*`, and `border-slate-*` literal across all ~46 page/component
files has now been converted to the semantic tokens (`text-foreground`,
`text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`, etc.), so
the whole app — not just Layout/Dashboard/EntityCrudPage — now inherits the
Obsidian/Emerald/Gold identity and both themes correctly. The 3 duplicated
local `StatCard` implementations the design brief flagged (in Finance,
MilkProduction, and BreedingAnalytics) were removed in favor of the shared
`KpiCard`, and the ad-hoc page headers on Breeding, HealthRecords, Inventory,
Reports, PredictiveAnalytics, and Settings now use `PageHeader`.

**What's still genuinely unfinished** (being honest about scope):
- Ad-hoc `Badge` colors (e.g. `bg-emerald-100 text-emerald-700` for pregnancy
  outcomes, task priority, etc.) still exist in ~17 files rather than being
  routed through the new `StatusBadge` component. I deliberately didn't
  blanket-convert these: `StatusBadge` displays exactly the `value` you pass
  it (it doesn't support "show X, color as Y"), so swapping it in on grades,
  priorities, and outcome labels needs a human judgment call per label
  rather than a mechanical find-replace — doing it by script produced a real
  bug earlier in this pass (a badge showing "Active" instead of the actual
  milk quality grade) that had to be caught and reverted.
- `EmptyState`/`ErrorState`/`LoadingSkeleton` are only wired into
  `EntityCrudPage` and `MilkProduction.jsx` so far — Inventory, Reports'
  7 tabs, Breeding, Health, Settings, and the cattle profile still show a
  plain spinner or "no data" text rather than the richer empty states.
- No accessibility audit (keyboard nav, focus states, ARIA labels) has been
  done yet.
- No micro-interactions/transitions pass (card hover, modal entrance, etc.)
  beyond what shadcn's primitives already include by default.
