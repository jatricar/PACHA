from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user, CurrentUser
from app.core.config import TIER_FIELD_LIMITS
from app.models.domain import FieldEntity, FieldCreateSchema, FieldResponseSchema, FieldUsageSummarySchema, UserProfileEntity
from app.engine.usage_tracking import log_usage_event

router = APIRouter(prefix="/fields", tags=["Fields"])


def _get_or_create_profile(db: Session, user_id: str) -> UserProfileEntity:
    profile = db.query(UserProfileEntity).filter(UserProfileEntity.user_id == user_id).first()
    if not profile:
        profile = UserProfileEntity(user_id=user_id, tier="free")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _field_limit_for(profile: UserProfileEntity) -> int:
    if profile.field_limit_override is not None:
        return profile.field_limit_override
    return TIER_FIELD_LIMITS.get(profile.tier, TIER_FIELD_LIMITS["free"])


@router.post("/", response_model=FieldResponseSchema)
def create_field(
    field_data: FieldCreateSchema,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new saved crop field, owned by the authenticated user."""
    profile = _get_or_create_profile(db, current_user.id)
    limit = _field_limit_for(profile)
    current_count = db.query(FieldEntity).filter(FieldEntity.user_id == current_user.id).count()

    if current_count >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"Field limit reached ({limit} fields for your '{profile.tier}' plan). Contact the admin to upgrade."
        )

    field_item = FieldEntity(**field_data.model_dump(), user_id=current_user.id)
    db.add(field_item)
    db.commit()
    db.refresh(field_item)

    log_usage_event(db, current_user.id, "field_created", {"crop_id": field_item.crop_id})
    return field_item


@router.get("/", response_model=List[FieldResponseSchema])
def list_fields(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List only the authenticated user's own saved fields."""
    return (
        db.query(FieldEntity)
        .filter(FieldEntity.user_id == current_user.id)
        .order_by(FieldEntity.created_at.desc())
        .all()
    )


@router.get("/usage-summary", response_model=FieldUsageSummarySchema)
def get_usage_summary(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Used/limit/tier info for the frontend's 'X/5 fields used' indicator."""
    profile = _get_or_create_profile(db, current_user.id)
    used = db.query(FieldEntity).filter(FieldEntity.user_id == current_user.id).count()
    return FieldUsageSummarySchema(used=used, limit=_field_limit_for(profile), tier=profile.tier)


@router.get("/{field_id}", response_model=FieldResponseSchema)
def get_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single field - only if it belongs to the authenticated user."""
    field_item = (
        db.query(FieldEntity)
        .filter(FieldEntity.id == field_id, FieldEntity.user_id == current_user.id)
        .first()
    )
    if not field_item:
        raise HTTPException(status_code=404, detail="Field not found")
    return field_item


@router.delete("/{field_id}")
def delete_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a field - only if it belongs to the authenticated user."""
    field_item = (
        db.query(FieldEntity)
        .filter(FieldEntity.id == field_id, FieldEntity.user_id == current_user.id)
        .first()
    )
    if not field_item:
        raise HTTPException(status_code=404, detail="Field not found")
    db.delete(field_item)
    db.commit()
    return {"message": "Field deleted successfully"}
