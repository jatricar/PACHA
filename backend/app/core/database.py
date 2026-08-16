from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import DATABASE_URL

# Some providers (older Heroku/Supabase examples) hand out "postgres://"
# URLs, but SQLAlchemy 1.4+ requires the "postgresql://" scheme.
_normalized_url = DATABASE_URL
if _normalized_url.startswith("postgres://"):
    _normalized_url = _normalized_url.replace("postgres://", "postgresql://", 1)

_is_sqlite = "sqlite" in _normalized_url

engine = create_engine(
    _normalized_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    # Supabase's pooled connections (and most managed Postgres) can silently
    # drop idle connections; pre_ping + recycle avoid "connection already
    # closed" errors on a request after the app has been idle for a while
    # (very relevant on Render's free tier, which spins the service down
    # after 15 minutes of inactivity).
    pool_pre_ping=True,
    pool_recycle=300 if not _is_sqlite else -1,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
