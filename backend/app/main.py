from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.endpoints import crops, fields, stress

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Abiotic Plant Stress Prediction & Advisory Engine",
    description="Predicts extreme temperature, VPD, waterlogging, and drought stress for the top 10 world crops and generates biostimulant recommendations.",
    version="1.0.0"
)

# CORS configuration for Web and Mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crops.router, prefix="/api")
app.include_router(fields.router, prefix="/api")
app.include_router(stress.router, prefix="/api")

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Abiotic Plant Stress Prediction & Agronomic Advisory Engine",
        "supported_crops": 10
    }
