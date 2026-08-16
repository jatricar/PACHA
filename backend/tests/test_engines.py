import asyncio
import pytest
from app.engine.weather_aggregator import calculate_vpd, calculate_svp, calculate_hargreaves_pet, weather_engine
from app.engine.phenology_gdd import phenology_engine
from app.engine.stress_analyzer import stress_engine
from app.engine.recommendation_engine import recommendation_engine

def test_vpd_math():
    svp_25 = calculate_svp(25.0)
    assert round(svp_25, 2) == 3.17
    
    vpd_25_50 = calculate_vpd(25.0, 50.0)
    assert round(vpd_25_50, 2) == 1.58

def test_phenology_maize():
    res = phenology_engine.evaluate_field_phenology(
        crop_id="maize",
        planting_date_str="2026-05-01",
        current_date_str="2026-07-01",
        maturity_class="medium"
    )
    assert res["crop_name"] == "Maize (Corn)"
    assert res["progress_pct"] > 0
    assert "current_stage" in res

def test_stress_analyzer_heat_and_drought():
    phenology = phenology_engine.evaluate_field_phenology("maize", "2026-05-01", current_date_str="2026-07-01")
    
    mock_forecast = [
        {"date": "2026-07-02", "temp_max": 38.0, "temp_min": 24.0, "temp_avg": 31.0, "humidity_avg": 40.0, "vpd_max": 2.7, "vpd_avg": 1.8, "precipitation": 0.0, "pet": 6.5},
        {"date": "2026-07-03", "temp_max": 37.5, "temp_min": 23.5, "temp_avg": 30.5, "humidity_avg": 42.0, "vpd_max": 2.6, "vpd_avg": 1.7, "precipitation": 0.0, "pet": 6.2},
        {"date": "2026-07-04", "temp_max": 36.0, "temp_min": 22.0, "temp_avg": 29.0, "humidity_avg": 45.0, "vpd_max": 2.4, "vpd_avg": 1.5, "precipitation": 0.0, "pet": 5.8},
        {"date": "2026-07-05", "temp_max": 35.5, "temp_min": 21.5, "temp_avg": 28.5, "humidity_avg": 48.0, "vpd_max": 2.3, "vpd_avg": 1.4, "precipitation": 0.0, "pet": 5.5},
        {"date": "2026-07-06", "temp_max": 34.0, "temp_min": 20.0, "temp_avg": 27.0, "humidity_avg": 50.0, "vpd_max": 2.1, "vpd_avg": 1.3, "precipitation": 0.0, "pet": 5.0},
        {"date": "2026-07-07", "temp_max": 33.5, "temp_min": 19.5, "temp_avg": 26.5, "humidity_avg": 52.0, "vpd_max": 2.0, "vpd_avg": 1.2, "precipitation": 0.0, "pet": 4.8},
        {"date": "2026-07-08", "temp_max": 33.0, "temp_min": 19.0, "temp_avg": 26.0, "humidity_avg": 55.0, "vpd_max": 1.9, "vpd_avg": 1.1, "precipitation": 0.0, "pet": 4.5},
    ]

    stresses = stress_engine.analyze_abiotic_stresses("maize", phenology, mock_forecast, {})
    
    heat_stress = next(s for s in stresses if s["stress_type"] == "heat")
    drought_stress = next(s for s in stresses if s["stress_type"] == "drought")
    
    assert heat_stress["severity"] in ["High", "Severe"]
    assert drought_stress["severity"] in ["High", "Severe"]

def test_recommendation_engine():
    phenology = phenology_engine.evaluate_field_phenology("maize", "2026-05-01", current_date_str="2026-07-01")
    stresses = [
        {"stress_type": "heat", "title": "Extreme Temperature (Heat)", "severity": "Severe", "score": 90.0},
        {"stress_type": "drought", "title": "Drought / Soil Moisture Deficit", "severity": "High", "score": 75.0}
    ]
    recs = recommendation_engine.generate_recommendations(stresses, "maize", phenology)
    assert len(recs) > 0
    assert any("Ascophyllum" in r["product_name"] or "Amino" in r["product_name"] or "Proline" in r["product_name"] for r in recs)

def test_historical_baseline_returns_12_months_even_offline():
    """Whether ERA5 succeeds or the synthetic fallback kicks in (e.g. no
    network in this test environment), the shape must always be 12 valid
    months plus a _meta flag saying which source was actually used."""
    result = asyncio.run(weather_engine.get_historical_baseline(41.8781, -87.6298))
    assert "_meta" in result
    assert result["_meta"]["data_source"] in ("era5_archive", "synthetic_fallback")
    months = [k for k in result.keys() if k != "_meta"]
    assert len(months) == 12
    for m in months:
        assert "hist_temp_max" in result[m]
        assert "hist_temp_min" in result[m]

def test_ensemble_forecast_falls_back_gracefully_offline():
    """If all 3 live sources are unreachable, we must still get exactly 7 days
    back, clearly tagged as synthetic instead of silently pretending to be live."""
    forecast = asyncio.run(weather_engine.get_7day_ensemble_forecast(41.8781, -87.6298))
    assert len(forecast) == 7
    for day in forecast:
        assert day["data_source"] in ("live", "partial_live", "synthetic_fallback")

def test_stress_analyzer_uses_real_crop_frost_threshold():
    """Rice and oil palm are tropical crops with HIGH chilling thresholds
    (8°C and 10°C respectively per crops_database.json) - they suffer real
    cold injury well above freezing. The old hardcoded heuristic only ever
    used 0.0 or -2.0 for every crop, which massively under-detected cold
    stress for tropical crops."""
    from app.engine.phenology_gdd import phenology_engine

    phenology = phenology_engine.evaluate_field_phenology("rice", "2026-05-01", current_date_str="2026-07-01")
    mild_forecast = [
        {"date": f"2026-07-{i:02d}", "temp_max": 24.0, "temp_min": 6.0, "vpd_max": 1.0, "vpd_avg": 0.8, "precipitation": 5.0, "pet": 4.0}
        for i in range(1, 8)
    ]
    stresses = stress_engine.analyze_abiotic_stresses("rice", phenology, mild_forecast, {})
    frost = next(s for s in stresses if s["stress_type"] == "frost")
    # 6°C is well below rice's real 8°C chilling threshold -> must register as stress.
    assert frost["severity"] != "None"

    # Same 6°C minimum is NOT dangerous for a crop like maize (t_frost_crit=0.0).
    phenology_maize = phenology_engine.evaluate_field_phenology("maize", "2026-05-01", current_date_str="2026-07-01")
    stresses_maize = stress_engine.analyze_abiotic_stresses("maize", phenology_maize, mild_forecast, {})
    frost_maize = next(s for s in stresses_maize if s["stress_type"] == "frost")
    assert frost_maize["severity"] == "None"

def test_phenology_respects_southern_hemisphere_winter():
    """Regression test for the Mar del Plata bug: a Southern Hemisphere field
    planted in autumn/winter (Jun-Aug) must NOT be estimated as if it were in
    peak summer heat when no real weather record is available for a day."""
    from app.engine.phenology_gdd import phenology_engine

    mar_del_plata_lat = -38.0  # Argentina, Southern Hemisphere

    # Barley planted 2026-06-05 (Southern Hemisphere winter), no real weather
    # data supplied -> must fall back to the seasonal estimate, and that
    # estimate must reflect a COLD season, not a warm one.
    result_south = phenology_engine.evaluate_field_phenology(
        crop_id="barley",
        planting_date_str="2026-06-05",
        current_date_str="2026-08-04",
        lat=mar_del_plata_lat,
    )
    # Same crop/dates but treated as Northern Hemisphere (the old, buggy default).
    result_north = phenology_engine.evaluate_field_phenology(
        crop_id="barley",
        planting_date_str="2026-06-05",
        current_date_str="2026-08-04",
        lat=10.0,
    )

    # Southern hemisphere winter must accumulate meaningfully LESS GDD than
    # the (correctly warm) Northern hemisphere summer for the same 60-day span.
    assert result_south["accumulated_gdd"] < result_north["accumulated_gdd"]
    # And it must be clearly below the old buggy northern-hemisphere-biased
    # estimate (~1200 GDD for this exact case, i.e. winter mistaken for summer).
    assert result_south["accumulated_gdd"] < 1000
    assert result_north["accumulated_gdd"] > 1000
