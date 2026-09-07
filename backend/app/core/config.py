import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/app
BACKEND_DIR = BASE_DIR.parent                       # backend/

# Load backend/.env automatically, so you don't have to type `set VAR=...`
# for every variable in a fresh terminal. Explicit path so this works no
# matter which directory you happen to run uvicorn/pytest from.
load_dotenv(dotenv_path=BACKEND_DIR / ".env")

DATA_DIR = BASE_DIR / "data"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR.parent}/plant_stress.db")

# Project Settings -> API -> Project URL in the Supabase dashboard.
SUPABASE_URL = os.getenv("SUPABASE_URL", "")

# Supabase's gateway requires an `apikey` header on essentially every request
# now, including the public JWKS endpoint used to verify user session JWTs.
# Project Settings -> API -> Project API keys -> "anon" / "publishable" key
# (safe to use here - it's the same public key already used in the frontend).
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# Fallback only: the legacy shared secret, used if SUPABASE_URL isn't set or
# the JWKS endpoint is unreachable. Project Settings -> API -> JWT Settings.
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Comma-separated list of emails allowed to access /api/admin/* endpoints,
# e.g. "you@example.com,colleague@example.com"
ADMIN_EMAILS = set(
    e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()
)

# Freemium field limits, overridable per-user via the admin panel.
TIER_FIELD_LIMITS = {"free": 5, "premium": 50}
