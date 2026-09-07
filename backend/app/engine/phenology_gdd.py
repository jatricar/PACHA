import json
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.core.config import DATA_DIR

class PhenologyGDDEngine:
    def __init__(self):
        crops_file = DATA_DIR / "crops_database.json"
        with open(crops_file, "r", encoding="utf-8") as f:
            self.database = json.load(f)["crops"]

    def calculate_daily_gdd(self, temp_max: float, temp_min: float, t_base: float, t_opt: float) -> float:
        """Calculate Growing Degree Days (GDD) with thermal cutoff limits."""
        t_max_adj = min(temp_max, t_opt)
        t_min_adj = max(temp_min, t_base)
        t_avg = (t_max_adj + t_min_adj) / 2.0
        gdd = t_avg - t_base
        return max(0.0, round(gdd, 2))

    def _estimate_temps_for_day(self, d_date: datetime, lat: Optional[float], historical_baseline: Optional[Dict[str, Any]] = None) -> tuple:
        """Best-available temperature estimate for a day with no real weather
        record, in priority order:
        1. The location's own real 30-year ERA5 monthly climatology (accurate,
           location-specific - this is what we use for most of the forward
           projection to harvest, since real forecasts only cover ~7 days).
        2. A generic latitude-aware seasonal sine curve, only if ERA5 data for
           this location isn't available either (last resort).
        """
        if historical_baseline:
            month_data = historical_baseline.get(str(d_date.month))
            if month_data and month_data.get("hist_temp_max") is not None and month_data.get("hist_temp_min") is not None:
                return month_data["hist_temp_max"], month_data["hist_temp_min"]
        return self._estimate_seasonal_temps(d_date, lat)

    def _estimate_seasonal_temps(self, d_date: datetime, lat: Optional[float]) -> tuple:
        """Generic latitude-aware seasonal fallback, used only when neither real
        weather NOR the location's ERA5 climatology is available. Southern
        hemisphere fields (lat < 0) have their warm/cool season flipped relative
        to the north - this used to be a hardcoded northern-hemisphere
        assumption, which badly under/over-estimated GDD for fields below the
        equator (e.g. winter in Argentina was being treated as summer). Being a
        global approximation, it won't capture regional effects (e.g. a
        maritime-moderated climate like Mar del Plata's) as well as real ERA5
        data does - it is intentionally a last-resort fallback, not the primary
        source for forward projection."""
        day_of_year = d_date.timetuple().tm_yday
        hemisphere_sign = 1.0 if (lat is None or lat >= 0) else -1.0
        seasonal_temp = 22.0 + 8.0 * math.sin(2 * math.pi * (day_of_year - 80) / 365) * hemisphere_sign
        tmax = seasonal_temp + 5.0
        tmin = seasonal_temp - 5.0
        return tmax, tmin

    def evaluate_field_phenology(
        self,
        crop_id: str,
        planting_date_str: str,
        maturity_class: str = "medium",
        current_date_str: str = None,
        recent_weather: Any = None,
        lat: Optional[float] = None,
        historical_baseline: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Evaluate field phenological progress, BBCH stage, and GDD accumulation.

        recent_weather: preferably a dict keyed by "YYYY-MM-DD" -> {temp_max, temp_min, ...}
        covering (ideally) every day since planting - this is real observed/forecast
        weather and always takes priority. Days without a matching entry fall back to
        the location's real ERA5 monthly climatology (historical_baseline), and only
        then to a generic latitude-aware seasonal estimate. A list of dicts with a
        "date" key is also accepted for backward compatibility.
        """
        if crop_id not in self.database:
            crop_id = "maize"

        crop_info = self.database[crop_id]
        t_base = crop_info["t_base"]
        t_opt = crop_info["t_opt"]
        base_total_gdd = crop_info["total_gdd"]

        maturity_mult = crop_info.get("maturity_varieties", {}).get(maturity_class.lower(), 1.0)
        total_required_gdd = base_total_gdd * maturity_mult

        p_date = datetime.strptime(planting_date_str, "%Y-%m-%d")
        if current_date_str:
            c_date = datetime.strptime(current_date_str, "%Y-%m-%d")
        else:
            c_date = datetime.utcnow()

        days_after_planting = max(0, (c_date - p_date).days)

        # Normalize recent_weather into a date-string -> record dict for O(1) lookups.
        weather_by_date: Dict[str, Dict[str, Any]] = {}
        if isinstance(recent_weather, dict):
            weather_by_date = recent_weather
        elif isinstance(recent_weather, list):
            for w in recent_weather:
                d = w.get("date")
                if d:
                    weather_by_date[d] = w

        days_with_real_data = 0

        # Accumulate GDD based on real weather where available, seasonal estimate otherwise
        accumulated_gdd = 0.0
        for day_i in range(days_after_planting):
            d_date = p_date + timedelta(days=day_i)
            day_str = d_date.strftime("%Y-%m-%d")

            matching_weather = weather_by_date.get(day_str)

            if matching_weather and matching_weather.get("temp_max") is not None and matching_weather.get("temp_min") is not None:
                tmax = matching_weather["temp_max"]
                tmin = matching_weather["temp_min"]
                days_with_real_data += 1
            else:
                tmax, tmin = self._estimate_temps_for_day(d_date, lat, historical_baseline)

            daily_gdd = self.calculate_daily_gdd(tmax, tmin, t_base, t_opt)
            accumulated_gdd += daily_gdd

        data_completeness_pct = round(100.0 * days_with_real_data / days_after_planting, 1) if days_after_planting > 0 else 100.0

        progress_pct = min(100.0, round((accumulated_gdd / total_required_gdd) * 100.0, 1))

        # Determine current BBCH stage
        stages_data = crop_info["stages"]
        stages_response = []
        current_stage = None

        prev_gdd_pct = 0.0
        for stg in stages_data:
            stg_gdd_pct = stg["gdd_pct"] * 100.0
            
            is_completed = progress_pct >= stg_gdd_pct
            is_current = (progress_pct >= prev_gdd_pct) and (progress_pct < stg_gdd_pct or stg == stages_data[-1])

            stage_obj = {
                "name": stg["name"],
                "bbch": stg["bbch"],
                "gdd_pct": stg_gdd_pct,
                "heat_threshold": stg["heat_threshold"],
                "vpd_max_threshold": stg["vpd_max_threshold"],
                "is_current": is_current,
                "is_completed": is_completed
            }
            stages_response.append(stage_obj)

            if is_current and current_stage is None:
                current_stage = stage_obj
            prev_gdd_pct = stg_gdd_pct

        if current_stage is None:
            current_stage = stages_response[-1]

        # Calculate projected maturity date by simulating forward day-by-day —
        # mirrors the backward-looking accumulation above: real forecast data
        # where we have it, the same latitude-aware seasonal estimate everywhere
        # else. This replaces the old flat "near-optimal growth every day"
        # assumption, which badly underestimated time-to-maturity for crops
        # heading into a cooler season (e.g. barley planted in autumn in the
        # Southern Hemisphere).
        MAX_SIMULATION_DAYS = 500  # safety cap - no real crop takes longer than this
        projected_maturity_date = None
        maturity_uncertain = False

        if accumulated_gdd >= total_required_gdd:
            projected_maturity_date = c_date.strftime("%Y-%m-%d")
        else:
            sim_date = c_date
            sim_accumulated = accumulated_gdd
            for _ in range(MAX_SIMULATION_DAYS):
                day_str = sim_date.strftime("%Y-%m-%d")
                matching_weather = weather_by_date.get(day_str)

                if matching_weather and matching_weather.get("temp_max") is not None and matching_weather.get("temp_min") is not None:
                    tmax = matching_weather["temp_max"]
                    tmin = matching_weather["temp_min"]
                else:
                    tmax, tmin = self._estimate_temps_for_day(sim_date, lat, historical_baseline)

                sim_accumulated += self.calculate_daily_gdd(tmax, tmin, t_base, t_opt)
                sim_date += timedelta(days=1)

                if sim_accumulated >= total_required_gdd:
                    projected_maturity_date = sim_date.strftime("%Y-%m-%d")
                    break

            if projected_maturity_date is None:
                # Didn't reach maturity within the cap - report as indeterminate
                # rather than silently showing a misleadingly precise date.
                maturity_uncertain = True

        return {
            "crop_name": crop_info["name"],
            "scientific_name": crop_info["scientific_name"],
            "variety": crop_info.get("name", crop_id),
            "planting_date": planting_date_str,
            "current_date": c_date.strftime("%Y-%m-%d"),
            "days_after_planting": days_after_planting,
            "accumulated_gdd": round(accumulated_gdd, 1),
            "total_required_gdd": round(total_required_gdd, 1),
            "data_completeness_pct": data_completeness_pct,
            "progress_pct": progress_pct,
            "current_stage": current_stage,
            "all_stages": stages_response,
            "projected_maturity_date": projected_maturity_date,
            "maturity_uncertain": maturity_uncertain
        }

phenology_engine = PhenologyGDDEngine()
