from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import FieldEntity, FieldCreateSchema, FieldResponseSchema

router = APIRouter(prefix="/fields", tags=["Fields"])

@router.post("/", response_model=FieldResponseSchema)
def create_field(field_data: FieldCreateSchema, db: Session = Depends(get_db)):
    """Create a new saved crop field."""
    field_item = FieldEntity(**field_data.model_dump())
    db.add(field_item)
    db.commit()
    db.refresh(field_item)
    return field_item

@router.get("/", response_model=List[FieldResponseSchema])
def list_fields(db: Session = Depends(get_db)):
    """List all saved crop fields."""
    return db.query(FieldEntity).order_by(FieldEntity.created_at.desc()).all()

@router.get("/{field_id}", response_model=FieldResponseSchema)
def get_field(field_id: int, db: Session = Depends(get_db)):
    """Get single field details."""
    field_item = db.query(FieldEntity).filter(FieldEntity.id == field_id).first()
    if not field_item:
        raise HTTPException(status_code=404, detail="Field not found")
    return field_item

@router.delete("/{field_id}")
def delete_field(field_id: int, db: Session = Depends(get_db)):
    """Delete field."""
    field_item = db.query(FieldEntity).filter(FieldEntity.id == field_id).first()
    if not field_item:
        raise HTTPException(status_code=404, detail="Field not found")
    db.delete(field_item)
    db.commit()
    return {"message": "Field deleted successfully"}
