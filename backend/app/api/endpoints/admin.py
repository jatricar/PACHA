from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from datetime import datetime, timezone
import asyncio
import logging
from app.core.database import get_db
from app.core.auth import require_admin, CurrentUser
from app.engine.historical_ensemble import run_world_report
from app.models.domain import (
    FieldEntity, UserProfileEntity, UsageEventEntity,
    AdminUsersResponseSchema, AdminUserSummarySchema, AdminUsageSummarySchema
)

logger = logging.getLogger("pacha.admin")
router = APIRouter(prefix="/admin", tags=["Admin"])

# In-memory job state for the World Report background job. A single admin,
# single backend process, one-off/occasional operation - doesn't warrant a
# real job queue (Celery/Redis aren't part of this stack), and Render's free
# tier reverse proxy would very likely time out a single synchronous request
# that takes several minutes to run 217 external weather-API calls, hence
# running it as a background task the frontend polls instead.
_world_report_job = {"status": "idle", "completed": 0, "total": 0, "result": None, "error": None, "started_at": None}


@router.post("/world-report/generate")
async def start_world_report(
    lang: str = Query(default="es"),
    years_back: int = Query(default=25, ge=5, le=40),
    concurrency: int = Query(default=2, ge=1, le=10, description="Simultaneous in-flight requests to the archive API"),
    min_request_interval: float = Query(default=2.0, ge=0.5, le=15.0, description="Minimum seconds between request starts, shared across all stations"),
    _: CurrentUser = Depends(require_admin),
):
    """Kicks off the historical world-report batch job in the background and
    returns immediately - poll GET /admin/world-report/status for progress
    and the final result. Refuses to start a second run while one is
    already in progress (217 external API calls is enough load already).

    concurrency/min_request_interval default to conservative values after a
    first run at concurrency=6 with no throttling got 178/217 stations
    rate-limited (HTTP 429) by Open-Meteo's archive endpoint - exposed as
    query params so they can be tuned from the admin panel if still needed,
    without a redeploy."""
    if _world_report_job["status"] == "running":
        raise HTTPException(status_code=409, detail="A world report generation is already running")

    _world_report_job.update(status="running", completed=0, total=0, result=None, error=None,
                              started_at=datetime.now(timezone.utc).isoformat())

    def on_progress(completed: int, total: int):
        _world_report_job["completed"] = completed
        _world_report_job["total"] = total

    async def run_job():
        try:
            result = await run_world_report(
                lang=lang, years_back=years_back,
                concurrency=concurrency, min_request_interval=min_request_interval,
                on_progress=on_progress,
            )
            _world_report_job.update(status="done", result=result)
        except Exception as e:
            logger.error("World report job crashed: %s: %s", type(e).__name__, e)
            _world_report_job.update(status="error", error=f"{type(e).__name__}: {e}")

    asyncio.create_task(run_job())
    return {"status": "started"}


@router.get("/world-report/status")
def world_report_status(_: CurrentUser = Depends(require_admin)):
    """Current progress/result of the background job started above. The
    frontend polls this every few seconds while status == 'running'."""
    return _world_report_job


@router.get("/users", response_model=AdminUsersResponseSchema)
def list_users(db: Session = Depends(get_db), _: CurrentUser = Depends(require_admin)):
    """Who signed up, when, when they last logged in, their plan, and how many
    fields they have. Joins Supabase's own auth.users table (email/login
    history - Supabase manages this) with our app's field counts and tiers.

    Requires the backend's Postgres role to have read access to the `auth`
    schema, which is true by default for the connection string Supabase gives
    you. On local SQLite (no auth schema at all) this degrades gracefully."""
    try:
        auth_users = db.execute(text(
            "SELECT id, email, created_at, last_sign_in_at FROM auth.users ORDER BY created_at DESC"
        )).mappings().all()
    except Exception as e:
        return AdminUsersResponseSchema(
            users=[],
            note=f"auth.users not queryable in this environment (expected on local SQLite dev): {e}"
        )

    field_counts = dict(
        db.query(FieldEntity.user_id, func.count(FieldEntity.id))
        .group_by(FieldEntity.user_id).all()
    )
    profiles = {p.user_id: p for p in db.query(UserProfileEntity).all()}

    users = []
    for u in auth_users:
        uid = str(u["id"])
        profile = profiles.get(uid)
        users.append(AdminUserSummarySchema(
            id=uid,
            email=u["email"] or "",
            created_at=u["created_at"].isoformat() if u["created_at"] else None,
            last_sign_in_at=u["last_sign_in_at"].isoformat() if u["last_sign_in_at"] else None,
            tier=profile.tier if profile else "free",
            field_count=field_counts.get(uid, 0),
        ))

    return AdminUsersResponseSchema(users=users)


@router.patch("/users/{user_id}/tier")
def update_user_tier(
    user_id: str,
    tier: str = Query(..., description="'free' or 'premium'"),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
):
    """Move a user between the freemium and premium plans."""
    if tier not in ("free", "premium"):
        raise HTTPException(status_code=400, detail="tier must be 'free' or 'premium'")

    profile = db.query(UserProfileEntity).filter(UserProfileEntity.user_id == user_id).first()
    if not profile:
        profile = UserProfileEntity(user_id=user_id, tier=tier)
        db.add(profile)
    else:
        profile.tier = tier
    db.commit()
    return {"user_id": user_id, "tier": tier}


@router.get("/usage-summary", response_model=AdminUsageSummarySchema)
def usage_summary(db: Session = Depends(get_db), _: CurrentUser = Depends(require_admin)):
    """Aggregate product-usage metrics: total events, how many of each event
    type (field_created, stress_analyzed, ...), and which crops get queried
    most - the raw material for deciding what to improve and, eventually,
    which advertising partners would actually be relevant to your users."""
    events_by_type = dict(
        db.query(UsageEventEntity.event_type, func.count(UsageEventEntity.id))
        .group_by(UsageEventEntity.event_type).all()
    )

    crop_events = (
        db.query(UsageEventEntity.event_metadata)
        .filter(UsageEventEntity.event_type.in_(["field_created", "stress_analyzed"]))
        .all()
    )
    top_crops: dict = {}
    for (metadata,) in crop_events:
        if metadata and isinstance(metadata, dict):
            crop = metadata.get("crop_id")
            if crop:
                top_crops[crop] = top_crops.get(crop, 0) + 1

    total_events = db.query(func.count(UsageEventEntity.id)).scalar() or 0
    total_fields = db.query(func.count(FieldEntity.id)).scalar() or 0
    total_users = db.query(func.count(UserProfileEntity.user_id)).scalar() or 0

    return AdminUsageSummarySchema(
        total_events=total_events,
        total_fields=total_fields,
        total_users=total_users,
        events_by_type=events_by_type,
        top_crops=top_crops,
    )
