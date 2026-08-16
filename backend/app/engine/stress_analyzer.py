from typing import List, Dict, Any
from app.engine.phenology_gdd import phenology_engine

class StressAnalyzerEngine:
    def analyze_abiotic_stresses(
        self,
        crop_id: str,
        phenology: Dict[str, Any],
        forecast_7days: List[Dict[str, Any]],
        historical_baseline: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Evaluate 6 abiotic stress categories using weather forecasts and phenology stage sensitivity."""
        current_stage = phenology.get("current_stage", {})
        heat_thresh = current_stage.get("heat_threshold", 32.0)
        vpd_thresh = current_stage.get("vpd_max_threshold", 2.0)

        # Extract forecast max/mins over next 7 days
        max_temps = [d["temp_max"] for d in forecast_7days]
        min_temps = [d["temp_min"] for d in forecast_7days]
        max_vpds = [d["vpd_max"] for d in forecast_7days]
        avg_vpds = [d["vpd_avg"] for d in forecast_7days]
        precip_total = sum(d["precipitation"] for d in forecast_7days)
        pet_total = sum(d["pet"] for d in forecast_7days)
        max_single_day_precip = max(d["precipitation"] for d in forecast_7days) if forecast_7days else 0.0

        stresses = []

        # 1. HEAT STRESS EVALUATION
        h_days_above = sum(1 for t in max_temps if t >= heat_thresh)
        max_t = max(max_temps) if max_temps else 0.0
        if max_t >= heat_thresh + 4.0 or h_days_above >= 4:
            h_sev = "Severe"
            h_score = 90.0
        elif max_t >= heat_thresh + 2.0 or h_days_above >= 2:
            h_sev = "High"
            h_score = 75.0
        elif max_t >= heat_thresh:
            h_sev = "Moderate"
            h_score = 50.0
        elif max_t >= heat_thresh - 2.0:
            h_sev = "Low"
            h_score = 25.0
        else:
            h_sev = "None"
            h_score = 0.0

        stresses.append({
            "stress_type": "heat",
            "title": "Extreme Temperature (Heat)",
            "severity": h_sev,
            "score": h_score,
            "trigger_reason": f"{h_days_above} days forecast exceeding stage heat sensitivity threshold ({heat_thresh}°C). Max forecast: {max_t}°C.",
            "observed_metric": f"Max Temp: {max_t}°C",
            "critical_threshold": f"Threshold: {heat_thresh}°C"
        })

        # 2. FROST / COLD STRESS EVALUATION
        # Use the crop's own scientifically-sourced chilling/frost threshold
        # from crops_database.json (e.g. rice: 8°C, oil palm: 10°C - these
        # tropical crops suffer chilling injury well above 0°C, which a
        # generic "0 or -2" heuristic completely misses).
        crop_info = phenology_engine.database.get(crop_id, {})
        frost_thresh = crop_info.get("t_frost_crit", -2.0)
        min_t = min(min_temps) if min_temps else 0.0
        if min_t <= frost_thresh - 3.0:
            f_sev = "Severe"
            f_score = 95.0
        elif min_t <= frost_thresh - 1.0:
            f_sev = "High"
            f_score = 80.0
        elif min_t <= frost_thresh:
            f_sev = "Moderate"
            f_score = 55.0
        elif min_t <= frost_thresh + 3.0:
            f_sev = "Low"
            f_score = 25.0
        else:
            f_sev = "None"
            f_score = 0.0

        stresses.append({
            "stress_type": "frost",
            "title": "Extreme Temperature (Frost / Cold)",
            "severity": f_sev,
            "score": f_score,
            "trigger_reason": f"Minimum forecast temperature ({min_t}°C) reaching or dropping below frost tolerance limit.",
            "observed_metric": f"Min Temp: {min_t}°C",
            "critical_threshold": f"Threshold: {frost_thresh}°C"
        })

        # 3. HIGH VPD STRESS EVALUATION
        max_v = max(max_vpds) if max_vpds else 0.0
        if max_v >= vpd_thresh + 0.8:
            v_sev = "Severe"
            v_score = 85.0
        elif max_v >= vpd_thresh + 0.4:
            v_sev = "High"
            v_score = 70.0
        elif max_v >= vpd_thresh:
            v_sev = "Moderate"
            v_score = 50.0
        elif max_v >= vpd_thresh - 0.3:
            v_sev = "Low"
            v_score = 20.0
        else:
            v_sev = "None"
            v_score = 0.0

        stresses.append({
            "stress_type": "high_vpd",
            "title": "Vapor Pressure Deficit (High VPD)",
            "severity": v_sev,
            "score": v_score,
            "trigger_reason": f"High atmospheric evaporative demand (VPD max {max_v} kPa) inducing stomatal closure and transpiration stress.",
            "observed_metric": f"Max VPD: {max_v} kPa",
            "critical_threshold": f"Stage Threshold: {vpd_thresh} kPa"
        })

        # 4. LOW VPD STRESS EVALUATION
        min_avg_v = min(avg_vpds) if avg_vpds else 1.0
        if min_avg_v < 0.15:
            lv_sev = "High"
            lv_score = 65.0
        elif min_avg_v < 0.25:
            lv_sev = "Moderate"
            lv_score = 40.0
        elif min_avg_v < 0.40:
            lv_sev = "Low"
            lv_score = 20.0
        else:
            lv_sev = "None"
            lv_score = 0.0

        stresses.append({
            "stress_type": "low_vpd",
            "title": "Vapor Pressure Deficit (Low VPD)",
            "severity": lv_sev,
            "score": lv_score,
            "trigger_reason": f"Sustained high humidity / low VPD ({min_avg_v} kPa) suppressing nutrient transpiration flow and elevating pathogen risk.",
            "observed_metric": f"Min Avg VPD: {min_avg_v} kPa",
            "critical_threshold": "Optimal Range: 0.5 - 1.5 kPa"
        })

        # 5. DROUGHT STRESS EVALUATION
        water_ratio = precip_total / max(1.0, pet_total)
        if water_ratio < 0.20:
            d_sev = "Severe"
            d_score = 90.0
        elif water_ratio < 0.40:
            d_sev = "High"
            d_score = 75.0
        elif water_ratio < 0.65:
            d_sev = "Moderate"
            d_score = 45.0
        elif water_ratio < 0.85:
            d_sev = "Low"
            d_score = 20.0
        else:
            d_sev = "None"
            d_score = 0.0

        stresses.append({
            "stress_type": "drought",
            "title": "Drought / Soil Moisture Deficit",
            "severity": d_sev,
            "score": d_score,
            "trigger_reason": f"7-day rainfall ({precip_total:.1f} mm) covers only {water_ratio*100:.0f}% of crop evapotranspiration demand (PET: {pet_total:.1f} mm).",
            "observed_metric": f"Precip/PET: {water_ratio*100:.0f}%",
            "critical_threshold": "Threshold: 65% PET coverage"
        })

        # 6. WATERLOGGING STRESS EVALUATION
        if max_single_day_precip >= 50.0 or precip_total >= 90.0:
            wl_sev = "Severe"
            wl_score = 90.0
        elif max_single_day_precip >= 35.0 or precip_total >= 65.0:
            wl_sev = "High"
            wl_score = 70.0
        elif max_single_day_precip >= 25.0 or precip_total >= 45.0:
            wl_sev = "Moderate"
            wl_score = 45.0
        elif max_single_day_precip >= 15.0:
            wl_sev = "Low"
            wl_score = 20.0
        else:
            wl_sev = "None"
            wl_score = 0.0

        stresses.append({
            "stress_type": "waterlogging",
            "title": "Waterlogging / Root Anoxia",
            "severity": wl_sev,
            "score": wl_score,
            "trigger_reason": f"Excessive rainfall forecast (Peak 24h: {max_single_day_precip:.1f} mm, Total: {precip_total:.1f} mm) threatening root oxygen deprivation.",
            "observed_metric": f"Max Rain: {max_single_day_precip:.1f} mm/day",
            "critical_threshold": "Infiltration Capacity: 30 mm/day"
        })

        return stresses

stress_engine = StressAnalyzerEngine()
