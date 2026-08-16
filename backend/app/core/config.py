import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR.parent}/plant_stress.db")
