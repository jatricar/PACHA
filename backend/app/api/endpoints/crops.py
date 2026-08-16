from fastapi import APIRouter
from app.engine.phenology_gdd import phenology_engine

router = APIRouter(prefix="/crops", tags=["Crops"])

@router.get("/")
def get_supported_crops():
    """Return catalog of top 10 world crops with GDD parameters."""
    return {"crops": phenology_engine.database}
