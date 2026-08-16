from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.core.database import Base

class FieldEntity(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    crop_id = Column(String(50), nullable=False)
    variety = Column(String(100), default="Standard Hybrid")
    maturity_class = Column(String(20), default="medium")  # early, medium, late
    planting_date = Column(String(10), nullable=False)    # YYYY-MM-DD
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic Schemas

class FieldCreateSchema(BaseModel):
    name: str = PydanticField(..., example="North Field - Plot 4")
    latitude: float = PydanticField(..., example=41.8781)
    longitude: float = PydanticField(..., example=-87.6298)
    crop_id: str = PydanticField(..., example="maize")
    variety: str = PydanticField(default="Standard Hybrid")
    maturity_class: str = PydanticField(default="medium", example="medium")
    planting_date: str = PydanticField(..., example="2026-05-10")
    notes: Optional[str] = None

class FieldResponseSchema(FieldCreateSchema):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class WeatherDaySchema(BaseModel):
    date: str
    temp_max: float
    temp_min: float
    temp_avg: float
    humidity_avg: float
    vpd_max: float
    vpd_avg: float
    precipitation: float
    pet: float
    sources_averaged: int = 3
    sources_used: List[str] = []
    is_forecast: bool = True
    data_source: str = "live"  # "live" | "partial_live" | "synthetic_fallback"

class HistoricalBaselineSchema(BaseModel):
    month: int
    hist_temp_max: float
    hist_temp_min: float
    hist_precipitation: float
    hist_vpd_avg: float

class GrowthStageSchema(BaseModel):
    name: str
    bbch: str
    gdd_pct: float
    heat_threshold: float
    vpd_max_threshold: float
    is_current: bool = False
    is_completed: bool = False

class PhenologyStatusSchema(BaseModel):
    crop_name: str
    scientific_name: str
    variety: str
    planting_date: str
    current_date: str
    days_after_planting: int
    accumulated_gdd: float
    total_required_gdd: float
    data_completeness_pct: float = 100.0  # % of days-since-planting backed by real weather data (vs. seasonal estimate)
    progress_pct: float
    current_stage: GrowthStageSchema
    all_stages: List[GrowthStageSchema]
    projected_maturity_date: str

class StressDetailSchema(BaseModel):
    stress_type: str  # heat, frost, high_vpd, low_vpd, drought, waterlogging
    title: str
    severity: str    # None, Low, Moderate, High, Severe
    score: float     # 0 to 100
    trigger_reason: str
    observed_metric: str
    critical_threshold: str

class ProductRecommendationSchema(BaseModel):
    product_id: str
    product_name: str
    category: str
    active_ingredients: List[str]
    target_stress: str
    severity: str
    dosage: str
    application_window: str
    scientific_rationale: str

class StressAssessmentResponseSchema(BaseModel):
    field_info: Dict[str, Any]
    phenology: PhenologyStatusSchema
    current_weather: WeatherDaySchema
    forecast_7days: List[WeatherDaySchema]
    historical_baseline: Dict[str, Any]
    stresses: List[StressDetailSchema]
    overall_stress_level: str
    recommendations: List[ProductRecommendationSchema]
    weather_data_source: Optional[str] = None       # "live" | "partial_live" | "synthetic_fallback"
    historical_data_source: Optional[str] = None     # "era5_archive" | "synthetic_fallback"
