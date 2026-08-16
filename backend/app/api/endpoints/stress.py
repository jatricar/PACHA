from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.domain import FieldEntity, StressAssessmentResponseSchema
from app.engine.weather_aggregator import weather_engine
from app.engine.phenology_gdd import phenology_engine
from app.engine.stress_analyzer import stress_engine
from app.engine.recommendation_engine import recommendation_engine

router = APIRouter(prefix="/stress", tags=["Abiotic Stress Analysis"])

@router.get("/analyze", response_model=StressAssessmentResponseSchema)
async def analyze_stress_adhoc(
    latitude: float = Query(..., example=41.8781),
    longitude: float = Query(..., example=-87.6298),
    crop_id: str = Query(..., example="maize"),
    planting_date: str = Query(..., example="2026-05-10"),
    variety: str = Query(default="Standard Hybrid"),
    maturity_class: str = Query(default="medium")
):
    """Ad-hoc abiotic stress prediction endpoint for any coordinates and crop parameters."""
    forecast = await weather_engine.get_7day_ensemble_forecast(latitude, longitude)
    hist_baseline = await weather_engine.get_historical_baseline(latitude, longitude)

    # Real daily weather since planting (ERA5 archive for older days + Open-Meteo
    # "past_days" recorded actuals for the last ~92 days), used to accumulate GDD
    # with real data instead of a generic estimate. Falls back to None (and thus
    # to the latitude-aware seasonal estimate inside phenology_gdd.py) if every
    # weather source is unreachable.
    p_date = datetime.strptime(planting_date, "%Y-%m-%d").date()
    gdd_series = await weather_engine.get_gdd_weather_series(latitude, longitude, p_date)
    forecast_by_date = {d["date"]: d for d in forecast}
    combined_weather_series = {**(gdd_series or {}), **forecast_by_date}

    phenology = phenology_engine.evaluate_field_phenology(
        crop_id=crop_id,
        planting_date_str=planting_date,
        maturity_class=maturity_class,
        recent_weather=combined_weather_series,
        lat=latitude,
    )

    stresses = stress_engine.analyze_abiotic_stresses(
        crop_id=crop_id,
        phenology=phenology,
        forecast_7days=forecast,
        historical_baseline=hist_baseline
    )

    # Determine overall stress level
    max_score = max(s["score"] for s in stresses) if stresses else 0.0
    if max_score >= 80.0:
        overall_level = "Severe"
    elif max_score >= 60.0:
        overall_level = "High"
    elif max_score >= 35.0:
        overall_level = "Moderate"
    elif max_score > 0:
        overall_level = "Low"
    else:
        overall_level = "Optimal"

    recommendations = recommendation_engine.generate_recommendations(stresses, crop_id, phenology)

    return {
        "field_info": {
            "latitude": latitude,
            "longitude": longitude,
            "crop_id": crop_id,
            "planting_date": planting_date,
            "variety": variety,
            "maturity_class": maturity_class
        },
        "phenology": phenology,
        "current_weather": forecast[0] if forecast else {},
        "forecast_7days": forecast,
        "historical_baseline": hist_baseline,
        "stresses": stresses,
        "overall_stress_level": overall_level,
        "recommendations": recommendations,
        "weather_data_source": forecast[0].get("data_source") if forecast else None,
        "historical_data_source": hist_baseline.get("_meta", {}).get("data_source"),
    }

@router.get("/analyze/field/{field_id}", response_model=StressAssessmentResponseSchema)
async def analyze_stress_field(field_id: int, db: Session = Depends(get_db)):
    """Analyze stress for a saved field by ID."""
    field_item = db.query(FieldEntity).filter(FieldEntity.id == field_id).first()
    if not field_item:
        raise HTTPException(status_code=404, detail="Field not found")

    return await analyze_stress_adhoc(
        latitude=field_item.latitude,
        longitude=field_item.longitude,
        crop_id=field_item.crop_id,
        planting_date=field_item.planting_date,
        variety=field_item.variety,
        maturity_class=field_item.maturity_class
    )
