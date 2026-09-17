"""
World Report / Historical Ensemble Engine
==========================================
Answers "what would PACHA typically tell a grower at this station, for this
crop and this representative planting date, based on real historical
weather?" - as opposed to the live app's single "today's forecast" analysis.

Method: for each station, fetch one continuous multi-decade daily weather
series from the ERA5 archive (real recorded data, not an estimate), then
replay the SAME planting date (month/day) against N individual historical
years' real weather - one full day-by-day GDD/phenology simulation per year,
exactly like the live engine does for a real field, just fed a real past
year's daily temperatures instead of a live forecast. Aggregating across
years gives honest, data-backed statements like "the extreme cold threshold
during flowering was exceeded in 4 of the last 20 years (20%)" instead of a
single-point estimate.

Deliberately reuses the exact same crop data (crops_database.json), GDD
formula, and stress severity breakpoints as the live engine
(phenology_gdd.py / stress_analyzer.py), so a report entry and a live field
analysis are never answering the question two different ways.

IMPORTANT WINDOW-LENGTH CAVEAT: stress_analyzer.py's severity breakpoints
were calibrated for a 7-day forecast window. Applying them unmodified to a
multi-week/month phenological stage window would badly over-trigger count-
or sum-based checks (e.g. "rain totalled >90mm" is a mild statement over a
60-day stage but a severe one over 7 days). Metrics based on a window's
MAX or MIN (heat, frost, high VPD, low VPD) generalize to any window length
without changes - a longer exposure window genuinely does carry more risk of
touching an extreme, which is the correct behavior here. Metrics based on a
COUNT or SUM (the heat "days above threshold" bump, waterlogging's total-
rainfall branch) are rescaled proportionally to the window's length relative
to the original 7-day calibration before comparing against the same
breakpoints - see _scale_count_threshold below.
"""

import asyncio
import json
import logging
from datetime import date as date_cls, datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from app.core.config import DATA_DIR
from app.engine.phenology_gdd import phenology_engine
from app.engine.recommendation_engine import recommendation_engine
from app.engine.weather_aggregator import weather_engine, calculate_vpd, calculate_hargreaves_pet

logger = logging.getLogger("pacha.world_report")

CROP_ID_ALIASES = {"maize_corn": "maize"}


class _RateLimiter:
    """Enforces a minimum gap between the START of consecutive requests
    across ALL concurrently-running stations, on top of (not instead of)
    limiting how many are in flight at once. Open-Meteo's archive endpoint
    rate-limited this job hard on the first run at concurrency=6 with no
    inter-request spacing (178 of 217 stations came back 429); this throttles
    proactively instead of only reacting after getting blocked."""

    def __init__(self, min_interval_seconds: float):
        self.min_interval = min_interval_seconds
        self._lock = asyncio.Lock()
        self._next_allowed = 0.0

    async def wait(self):
        async with self._lock:
            now = asyncio.get_event_loop().time()
            delay = max(0.0, self._next_allowed - now)
            self._next_allowed = max(now, self._next_allowed) + self.min_interval
        if delay > 0:
            await asyncio.sleep(delay)

# Same severity score mapping stress_analyzer.py uses, so a pseudo-stress
# built from this module sorts identically when handed to the shared
# recommendation engine.
SEVERITY_SCORE = {"Severe": 90.0, "High": 75.0, "Moderate": 50.0, "Low": 25.0, "None": 0.0}

STRESS_TITLES = {
    "heat": {"es": "Temperatura Extrema (Calor)", "en": "Extreme Temperature (Heat)"},
    "frost": {"es": "Temperatura Extrema (Helada / Frío)", "en": "Extreme Temperature (Frost / Cold)"},
    "high_vpd": {"es": "Déficit de Presión de Vapor (VPD Alto)", "en": "Vapor Pressure Deficit (High VPD)"},
    "low_vpd": {"es": "Déficit de Presión de Vapor (VPD Bajo)", "en": "Vapor Pressure Deficit (Low VPD)"},
    "drought": {"es": "Sequía / Déficit de Humedad del Suelo", "en": "Drought / Soil Moisture Deficit"},
    "waterlogging": {"es": "Anegamiento / Anoxia Radicular", "en": "Waterlogging / Root Anoxia"},
}

# A station's total simulated window is capped well above its typical cycle
# length (from the CSV's "mean cycle" notes) as a safety net for unusually
# cold/slow years, without ever having to raise it as high as
# phenology_gdd.py's generic 500-day cap (which would make one bad year eat
# a huge, mostly-empty chunk of every fetched daily series).
CROP_MAX_CYCLE_DAYS = {
    "sugarcane": 460, "maize": 170, "wheat": 250, "rice": 150,
    "potato": 140, "sugar_beet": 220, "soybean": 170, "cassava": 340,
    "oil_palm": 1200, "barley": 210,
}
DEFAULT_MAX_CYCLE_DAYS = 250


def _scale_count_threshold(base_days: float, window_days: int, calibration_window: int = 7) -> float:
    """Rescales a day-COUNT breakpoint (e.g. '4 of 7 days') to an equivalent
    fraction of an arbitrary-length window, so a long phenological stage
    isn't judged by a threshold calibrated for a 7-day forecast."""
    return base_days * (window_days / float(calibration_window))


def _classify_window_stresses(
    days: List[Dict[str, Any]],
    heat_thresh: float,
    frost_thresh: float,
    vpd_thresh: float,
) -> Dict[str, str]:
    """Applies the live app's exact severity breakpoints (stress_analyzer.py)
    to an arbitrary-length window of daily records, with count/sum-based
    checks rescaled per the module docstring. `days` is a list of
    {temp_max, temp_min, temp_avg, humidity_avg, precipitation} dicts for
    every day the crop spent in this stage, in this one historical year."""
    n = len(days)
    if n == 0:
        return {k: "None" for k in STRESS_TITLES}

    tmax_list = [d["temp_max"] for d in days]
    tmin_list = [d["temp_min"] for d in days]
    vpd_list = [calculate_vpd(d["temp_avg"], d.get("humidity_avg") or 65.0) for d in days]
    precip_list = [d.get("precipitation") or 0.0 for d in days]

    max_t = max(tmax_list)
    min_t = min(tmin_list)
    max_v = max(vpd_list)
    min_avg_v = min(vpd_list)  # single representative value per day, same as the live engine's "avg" series
    precip_total = sum(precip_list)
    max_single_day_precip = max(precip_list)

    out = {}

    # 1. HEAT - day-count bump rescaled to this window's length
    h_days_above = sum(1 for t in tmax_list if t >= heat_thresh)
    severe_bump = _scale_count_threshold(4, n)
    high_bump = _scale_count_threshold(2, n)
    if max_t >= heat_thresh + 4.0 or h_days_above >= severe_bump:
        out["heat"] = "Severe"
    elif max_t >= heat_thresh + 2.0 or h_days_above >= high_bump:
        out["heat"] = "High"
    elif max_t >= heat_thresh:
        out["heat"] = "Moderate"
    elif max_t >= heat_thresh - 2.0:
        out["heat"] = "Low"
    else:
        out["heat"] = "None"

    # 2. FROST - MIN-based, no rescaling needed
    if min_t <= frost_thresh - 3.0:
        out["frost"] = "Severe"
    elif min_t <= frost_thresh - 1.0:
        out["frost"] = "High"
    elif min_t <= frost_thresh:
        out["frost"] = "Moderate"
    elif min_t <= frost_thresh + 3.0:
        out["frost"] = "Low"
    else:
        out["frost"] = "None"

    # 3. HIGH VPD - MAX-based, no rescaling needed
    if max_v >= vpd_thresh + 0.8:
        out["high_vpd"] = "Severe"
    elif max_v >= vpd_thresh + 0.4:
        out["high_vpd"] = "High"
    elif max_v >= vpd_thresh:
        out["high_vpd"] = "Moderate"
    elif max_v >= vpd_thresh - 0.3:
        out["high_vpd"] = "Low"
    else:
        out["high_vpd"] = "None"

    # 4. LOW VPD - MIN-based, no rescaling needed
    if min_avg_v < 0.15:
        out["low_vpd"] = "High"
    elif min_avg_v < 0.25:
        out["low_vpd"] = "Moderate"
    elif min_avg_v < 0.40:
        out["low_vpd"] = "Low"
    else:
        out["low_vpd"] = "None"

    # 5. DROUGHT - dimensionless ratio, no rescaling needed
    pet_total = sum(
        calculate_hargreaves_pet(d["temp_max"], d["temp_min"], d["temp_avg"], 0.0) for d in days
    )
    water_ratio = precip_total / max(1.0, pet_total)
    if water_ratio < 0.20:
        out["drought"] = "Severe"
    elif water_ratio < 0.40:
        out["drought"] = "High"
    elif water_ratio < 0.65:
        out["drought"] = "Moderate"
    elif water_ratio < 0.85:
        out["drought"] = "Low"
    else:
        out["drought"] = "None"

    # 6. WATERLOGGING - peak single-day is window-length-agnostic; the
    # cumulative-total branch is rescaled to this window's length.
    total_severe = _scale_count_threshold(90.0, n)
    total_high = _scale_count_threshold(65.0, n)
    total_mod = _scale_count_threshold(45.0, n)
    if max_single_day_precip >= 50.0 or precip_total >= total_severe:
        out["waterlogging"] = "Severe"
    elif max_single_day_precip >= 35.0 or precip_total >= total_high:
        out["waterlogging"] = "High"
    elif max_single_day_precip >= 25.0 or precip_total >= total_mod:
        out["waterlogging"] = "Moderate"
    elif max_single_day_precip >= 15.0:
        out["waterlogging"] = "Low"
    else:
        out["waterlogging"] = "None"

    return out


def _simulate_one_year(
    crop_info: Dict[str, Any],
    daily_series: Dict[str, Dict[str, Any]],
    planting_date: date_cls,
    total_required_gdd: float,
    max_cycle_days: int,
) -> Optional[Dict[str, Any]]:
    """Day-by-day GDD accumulation for one specific historical year's real
    weather, starting at `planting_date`. Returns None if too much of the
    needed daily data is missing from the fetched series to trust this year
    at all (a gap in the archive, not a real climate signal)."""
    t_base, t_opt = crop_info["t_base"], crop_info["t_opt"]
    stages = crop_info["stages"]

    accumulated = 0.0
    stage_reached_date: Dict[int, date_cls] = {}
    day_records: List[Dict[str, Any]] = []
    missing_days = 0
    maturity_date = None

    for day_i in range(max_cycle_days):
        d = planting_date + timedelta(days=day_i)
        rec = daily_series.get(d.isoformat())
        if rec is None or rec.get("temp_max") is None or rec.get("temp_min") is None:
            missing_days += 1
            continue

        tmax, tmin = rec["temp_max"], rec["temp_min"]
        tavg = rec.get("temp_avg", (tmax + tmin) / 2.0)
        accumulated += phenology_engine.calculate_daily_gdd(tmax, tmin, t_base, t_opt)
        day_records.append({
            "date": d, "temp_max": tmax, "temp_min": tmin, "temp_avg": tavg,
            "humidity_avg": rec.get("humidity_avg"), "precipitation": rec.get("precipitation") or 0.0,
        })

        progress = accumulated / total_required_gdd
        for idx, stg in enumerate(stages):
            if idx not in stage_reached_date and progress >= stg["gdd_pct"]:
                stage_reached_date[idx] = d
        if progress >= 1.0:
            maturity_date = d
            break

    total_days_attempted = len(day_records) + missing_days
    if total_days_attempted == 0 or (missing_days / total_days_attempted) > 0.15:
        return None  # too many archive gaps to trust this year

    return {
        "planting_date": planting_date,
        "maturity_date": maturity_date,
        "days_to_maturity": (maturity_date - planting_date).days if maturity_date else None,
        "stage_reached_date": stage_reached_date,
        "day_records": day_records,
    }


async def run_station_ensemble(
    station: Dict[str, Any],
    years_back: int = 25,
    lang: str = "es",
    rate_limiter: Optional[_RateLimiter] = None,
) -> Dict[str, Any]:
    """Full historical ensemble for one station: fetches its multi-decade
    daily series once, replays the planting date against every usable
    individual year, and aggregates stage-by-stage stress exceedance."""
    crop_id = CROP_ID_ALIASES.get(station["crop_id"], station["crop_id"])
    crop_info = phenology_engine.database.get(crop_id)
    if crop_info is None:
        raise ValueError(f"Unknown crop_id '{crop_id}'")

    maturity_mult = crop_info.get("maturity_varieties", {}).get(station["maturity_class"].lower(), 1.0)
    total_required_gdd = crop_info["total_gdd"] * maturity_mult
    frost_thresh = crop_info.get("t_frost_crit", -2.0)
    max_cycle_days = min(
        int(1.3 * (station.get("reference_cycle_days") or CROP_MAX_CYCLE_DAYS.get(crop_id, DEFAULT_MAX_CYCLE_DAYS))),
        CROP_MAX_CYCLE_DAYS.get(crop_id, DEFAULT_MAX_CYCLE_DAYS) + 60,
    )

    if rate_limiter:
        await rate_limiter.wait()
    daily_series = await weather_engine.get_multi_year_daily_series(station["latitude"], station["longitude"], years_back)
    if not daily_series:
        raise RuntimeError("No historical weather data returned for this location")

    data_years = sorted({int(k[:4]) for k in daily_series.keys()})
    month, day = int(station["planting_month_day"][:2]), int(station["planting_month_day"][3:])

    # Only start a simulated year if the whole (padded) cycle window fits
    # inside the fetched data range - otherwise a late-fetched year would be
    # silently cut short and look like an early/failed maturity.
    buffer_years = (max_cycle_days // 365) + 2
    candidate_years = [y for y in data_years if (y + buffer_years) <= data_years[-1] + 1]

    year_results = []
    for y in candidate_years:
        try:
            p_date = date_cls(y, month, day)
        except ValueError:
            continue  # Feb 29 on a non-leap simulated year - skip, rare
        sim = _simulate_one_year(crop_info, daily_series, p_date, total_required_gdd, max_cycle_days)
        if sim:
            year_results.append(sim)

    if not year_results:
        raise RuntimeError("No individual historical years had enough usable daily data to simulate")

    # --- Aggregate stage calendar + stress exceedance across years ---
    stages = crop_info["stages"]
    stage_summaries = []
    all_pseudo_stresses: Dict[str, Dict[str, Any]] = {}  # stress_type -> best (highest exceedance) entry

    for idx, stg in enumerate(stages):
        days_into_cycle = []
        stress_years: Dict[str, List[str]] = {k: [] for k in STRESS_TITLES}

        for yr in year_results:
            end_date = yr["stage_reached_date"].get(idx)
            start_date = yr["stage_reached_date"].get(idx - 1) if idx > 0 else yr["planting_date"]
            if end_date is None or start_date is None:
                continue  # this stage wasn't reached in this particular year

            days_into_cycle.append((end_date - yr["planting_date"]).days)
            window_days = [d for d in yr["day_records"] if start_date <= d["date"] < end_date] or \
                          [d for d in yr["day_records"] if start_date <= d["date"] <= end_date]
            classification = _classify_window_stresses(window_days, stg["heat_threshold"], frost_thresh, stg["vpd_max_threshold"])
            for stress_type, severity in classification.items():
                stress_years[stress_type].append(severity)

        n_stage_years = len(days_into_cycle)
        risks = []
        for stress_type, severities in stress_years.items():
            if not severities:
                continue
            exceed_count = sum(1 for s in severities if s in ("Moderate", "High", "Severe"))
            exceedance_pct = round(100.0 * exceed_count / len(severities), 1)
            if exceedance_pct <= 0:
                continue
            # Most common severity among the years that DID exceed, for a
            # representative "typically how bad" label.
            exceeding = [s for s in severities if s in ("Moderate", "High", "Severe")]
            dominant_severity = max(set(exceeding), key=exceeding.count)
            risk_entry = {
                "stress_type": stress_type,
                "title": STRESS_TITLES[stress_type][lang if lang in ("es", "en") else "en"],
                "exceedance_pct": exceedance_pct,
                "dominant_severity": dominant_severity,
                "years_exceeded": exceed_count,
                "years_evaluated": len(severities),
            }
            risks.append(risk_entry)

            # Track the single highest-exceedance occurrence of each stress
            # type across the whole station (any stage) for the product
            # recommendation pass below.
            prior = all_pseudo_stresses.get(stress_type)
            if prior is None or exceedance_pct > prior["exceedance_pct"]:
                all_pseudo_stresses[stress_type] = {**risk_entry, "stage_name": stg["name_es"] if lang == "es" else stg["name"]}

        risks.sort(key=lambda r: r["exceedance_pct"], reverse=True)

        stage_summaries.append({
            "name": stg["name_es"] if lang == "es" and stg.get("name_es") else stg["name"],
            "bbch": stg["bbch"],
            "n_years_reached": n_stage_years,
            "typical_day_of_cycle": {
                "median": int(sorted(days_into_cycle)[len(days_into_cycle) // 2]) if days_into_cycle else None,
                "min": min(days_into_cycle) if days_into_cycle else None,
                "max": max(days_into_cycle) if days_into_cycle else None,
            },
            "risks": risks,
        })

    maturity_days = [yr["days_to_maturity"] for yr in year_results if yr["days_to_maturity"] is not None]
    maturity_summary = {
        "n_years_reached": len(maturity_days),
        "n_years_evaluated": len(year_results),
        "typical_days_to_maturity": {
            "median": int(sorted(maturity_days)[len(maturity_days) // 2]) if maturity_days else None,
            "min": min(maturity_days) if maturity_days else None,
            "max": max(maturity_days) if maturity_days else None,
        },
    }

    # --- Recommended products, reusing the exact same product-matching logic
    # the live app uses, fed this station's aggregate risk profile. ---
    pseudo_stresses = [
        {
            "stress_type": st,
            "title": entry["title"],
            "severity": entry["dominant_severity"],
            "score": SEVERITY_SCORE.get(entry["dominant_severity"], 0.0),
        }
        for st, entry in all_pseudo_stresses.items()
        if entry["exceedance_pct"] >= 15.0  # not worth recommending for a rare 1-in-20-year fluke
    ]
    recommended_products = recommendation_engine.generate_recommendations(pseudo_stresses, crop_id, None, lang=lang)

    crop_display_name = crop_info["name_es"] if lang == "es" and crop_info.get("name_es") else crop_info["name"]

    return {
        "station_name": station["name"],
        "country": station["country"],
        "latitude": station["latitude"],
        "longitude": station["longitude"],
        "crop_id": crop_id,
        "crop_name": crop_display_name,
        "variety": station["variety"],
        "maturity_class": station["maturity_class"],
        "planting_month_day": station["planting_month_day"],
        "is_real_field": station["is_real_field"],
        "years_evaluated": len(year_results),
        "years_available_in_archive": len(data_years),
        "stage_summary": stage_summaries,
        "maturity_summary": maturity_summary,
        "recommended_products": recommended_products,
        # Kept for the downloadable detail file, dropped from the on-screen summary.
        "_year_detail": [
            {
                "year": yr["planting_date"].year,
                "planting_date": yr["planting_date"].isoformat(),
                "maturity_date": yr["maturity_date"].isoformat() if yr["maturity_date"] else None,
                "days_to_maturity": yr["days_to_maturity"],
                "stage_dates": {
                    (stages[i]["name"]): d.isoformat() for i, d in yr["stage_reached_date"].items()
                },
            }
            for yr in year_results
        ],
    }


async def run_world_report(
    lang: str = "es",
    years_back: int = 25,
    concurrency: int = 2,
    min_request_interval: float = 2.0,
    on_progress=None,
) -> Dict[str, Any]:
    """Runs the full historical ensemble for every station in
    world_report_stations.json, grouped by crop. One failing station
    (e.g. a transient archive-API error) is recorded as an error entry
    rather than aborting the whole batch - with 217 external calls,
    some transient failures are expected.

    Defaults are deliberately conservative (low concurrency + a shared
    minimum gap between request starts): a first run at concurrency=6 with
    no spacing got 178 of 217 stations rate-limited (HTTP 429) by
    Open-Meteo's archive endpoint. This trades a longer total run (an
    occasional admin-triggered batch job, not a live user-facing request)
    for actually completing.

    on_progress(completed, total), if given, is called after each station
    finishes (success or failure) - lets a caller expose live progress for
    a job that can take several minutes, without any dependency on this
    module knowing HOW that progress is surfaced (HTTP polling, logs, etc)."""
    stations_file = DATA_DIR / "world_report_stations.json"
    with open(stations_file, "r", encoding="utf-8") as f:
        stations = json.load(f)["stations"]

    semaphore = asyncio.Semaphore(concurrency)
    rate_limiter = _RateLimiter(min_request_interval)
    errors: List[Dict[str, str]] = []
    by_crop: Dict[str, List[Dict[str, Any]]] = {}
    completed_count = 0

    async def process(station: Dict[str, Any]):
        nonlocal completed_count
        async with semaphore:
            try:
                report = await run_station_ensemble(station, years_back=years_back, lang=lang, rate_limiter=rate_limiter)
                crop_id = report["crop_id"]
                by_crop.setdefault(crop_id, []).append(report)
            except Exception as e:
                logger.error("World report failed for station '%s': %s: %s", station.get("name"), type(e).__name__, e)
                errors.append({"station_name": station.get("name", "?"), "error": f"{type(e).__name__}: {e}"})
            finally:
                completed_count += 1
                if on_progress:
                    on_progress(completed_count, len(stations))

    await asyncio.gather(*(process(s) for s in stations))

    for crop_id in by_crop:
        by_crop[crop_id].sort(key=lambda r: (r["country"] or "", r["station_name"]))

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "lang": lang,
        "years_back": years_back,
        "total_stations": len(stations),
        "successful_stations": sum(len(v) for v in by_crop.values()),
        "failed_stations": len(errors),
        "by_crop": by_crop,
        "errors": errors,
    }
