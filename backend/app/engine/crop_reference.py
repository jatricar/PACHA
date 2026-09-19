"""
Crop Reference / Methodology panel data.

Read-only fact sheet for the admin: for a given crop, what exactly PACHA's
engine uses to track its development and flag stress - the real GDD
parameters, the real per-stage thresholds, and the real severity breakpoints
used in stress_analyzer.py, not a re-description that could drift out of
sync with the code. The stress severity breakpoints ARE duplicated here as
literal numbers (Python constants aren't data files the frontend can read),
so IMPORTANT: if those breakpoints in stress_analyzer.py ever change, this
file's STRESS_METHODOLOGY constants must be updated to match, or this panel
will silently start describing the wrong thresholds.
"""
from typing import Dict, Any, List
from app.engine.phenology_gdd import phenology_engine
from app.engine.recommendation_engine import recommendation_engine

# Mirrors stress_analyzer.py's breakpoints exactly (see the module docstring
# above for why these are hand-duplicated instead of imported as data).
STRESS_METHODOLOGY = [
    {
        "stress_type": "heat",
        "title": {"es": "Temperatura Extrema (Calor)", "en": "Extreme Temperature (Heat)"},
        "measures": {
            "es": "Temperatura máxima pronosticada a 7 días, comparada contra el umbral de calor de la etapa actual.",
            "en": "7-day forecast maximum temperature, compared against the current stage's heat threshold.",
        },
        "threshold_source": {
            "es": "Umbral específico de cada etapa del cultivo (campo heat_threshold en crops_database.json).",
            "en": "Crop-stage-specific field (heat_threshold in crops_database.json).",
        },
        "breakpoints": {
            "es": [
                "Severo: máxima ≥ umbral+4°C, o ≥4 de los 7 días superan el umbral",
                "Alto: máxima ≥ umbral+2°C, o ≥2 de los 7 días superan el umbral",
                "Moderado: máxima ≥ umbral",
                "Bajo: máxima ≥ umbral−2°C",
                "Ninguno: por debajo de eso",
            ],
            "en": [
                "Severe: max ≥ threshold+4°C, or ≥4 of 7 days exceed the threshold",
                "High: max ≥ threshold+2°C, or ≥2 of 7 days exceed the threshold",
                "Moderate: max ≥ threshold",
                "Low: max ≥ threshold−2°C",
                "None: below that",
            ],
        },
    },
    {
        "stress_type": "frost",
        "title": {"es": "Temperatura Extrema (Helada / Frío)", "en": "Extreme Temperature (Frost / Cold)"},
        "measures": {
            "es": "Temperatura mínima pronosticada a 7 días, comparada contra el umbral de frío crítico del cultivo (constante para todo el ciclo, no varía por etapa).",
            "en": "7-day forecast minimum temperature, compared against the crop's critical frost threshold (constant for the whole cycle, not per-stage).",
        },
        "threshold_source": {
            "es": "Umbral fijo del cultivo (campo t_frost_crit en crops_database.json) — ej. cultivos tropicales como arroz o palma sufren a partir de 8-10°C, muy por encima de 0°C.",
            "en": "Fixed crop-level field (t_frost_crit in crops_database.json) - e.g. tropical crops like rice or oil palm suffer chilling injury starting around 8-10°C, well above 0°C.",
        },
        "breakpoints": {
            "es": [
                "Severo: mínima ≤ umbral−3°C",
                "Alto: mínima ≤ umbral−1°C",
                "Moderado: mínima ≤ umbral",
                "Bajo: mínima ≤ umbral+3°C",
                "Ninguno: por encima de eso",
            ],
            "en": [
                "Severe: min ≤ threshold−3°C",
                "High: min ≤ threshold−1°C",
                "Moderate: min ≤ threshold",
                "Low: min ≤ threshold+3°C",
                "None: above that",
            ],
        },
    },
    {
        "stress_type": "high_vpd",
        "title": {"es": "Déficit de Presión de Vapor (VPD Alto)", "en": "Vapor Pressure Deficit (High VPD)"},
        "measures": {
            "es": "VPD máximo pronosticado a 7 días (calculado desde temperatura y humedad relativa), comparado contra el umbral de la etapa actual.",
            "en": "7-day forecast maximum VPD (computed from temperature and relative humidity), compared against the current stage's threshold.",
        },
        "threshold_source": {
            "es": "Umbral específico de cada etapa (campo vpd_max_threshold en crops_database.json).",
            "en": "Crop-stage-specific field (vpd_max_threshold in crops_database.json).",
        },
        "breakpoints": {
            "es": [
                "Severo: VPD máx ≥ umbral+0.8 kPa", "Alto: VPD máx ≥ umbral+0.4 kPa",
                "Moderado: VPD máx ≥ umbral", "Bajo: VPD máx ≥ umbral−0.3 kPa", "Ninguno: por debajo de eso",
            ],
            "en": [
                "Severe: max VPD ≥ threshold+0.8 kPa", "High: max VPD ≥ threshold+0.4 kPa",
                "Moderate: max VPD ≥ threshold", "Low: max VPD ≥ threshold−0.3 kPa", "None: below that",
            ],
        },
    },
    {
        "stress_type": "low_vpd",
        "title": {"es": "Déficit de Presión de Vapor (VPD Bajo)", "en": "Vapor Pressure Deficit (Low VPD)"},
        "measures": {
            "es": "El menor VPD promedio diario pronosticado en los próximos 7 días - humedad sostenida alta que frena la transpiración y favorece hongos/patógenos.",
            "en": "The lowest forecast daily-average VPD over the next 7 days - sustained high humidity that suppresses transpiration and favors fungal/pathogen pressure.",
        },
        "threshold_source": {
            "es": "Rango óptimo fijo (0.5-1.5 kPa), no varía por cultivo ni etapa.",
            "en": "Fixed optimal range (0.5-1.5 kPa), does not vary by crop or stage.",
        },
        "breakpoints": {
            "es": ["Alto: VPD prom. mín < 0.15 kPa", "Moderado: < 0.25 kPa", "Bajo: < 0.40 kPa", "Ninguno: por encima de eso"],
            "en": ["High: min avg VPD < 0.15 kPa", "Moderate: < 0.25 kPa", "Low: < 0.40 kPa", "None: above that"],
        },
    },
    {
        "stress_type": "drought",
        "title": {"es": "Sequía / Déficit de Humedad del Suelo", "en": "Drought / Soil Moisture Deficit"},
        "measures": {
            "es": "Relación entre la lluvia acumulada a 7 días y la evapotranspiración potencial (PET, método de Hargreaves) del mismo período.",
            "en": "Ratio of 7-day accumulated rainfall to potential evapotranspiration (PET, Hargreaves method) over the same period.",
        },
        "threshold_source": {
            "es": "Umbral fijo (65% de cobertura), no varía por cultivo ni etapa.",
            "en": "Fixed threshold (65% coverage), does not vary by crop or stage.",
        },
        "breakpoints": {
            "es": ["Severo: cobertura < 20%", "Alto: < 40%", "Moderado: < 65%", "Bajo: < 85%", "Ninguno: por encima de eso"],
            "en": ["Severe: coverage < 20%", "High: < 40%", "Moderate: < 65%", "Low: < 85%", "None: above that"],
        },
    },
    {
        "stress_type": "waterlogging",
        "title": {"es": "Anegamiento / Anoxia Radicular", "en": "Waterlogging / Root Anoxia"},
        "measures": {
            "es": "Lluvia máxima en un solo día, y lluvia total acumulada, en el pronóstico a 7 días.",
            "en": "Peak single-day rainfall, and total accumulated rainfall, over the 7-day forecast.",
        },
        "threshold_source": {
            "es": "Umbrales fijos (capacidad de infiltración genérica de 30mm/día), no varía por cultivo ni etapa.",
            "en": "Fixed thresholds (generic 30mm/day infiltration capacity), does not vary by crop or stage.",
        },
        "breakpoints": {
            "es": [
                "Severo: pico ≥ 50mm/día, o total 7 días ≥ 90mm", "Alto: pico ≥ 35mm/día, o total ≥ 65mm",
                "Moderado: pico ≥ 25mm/día, o total ≥ 45mm", "Bajo: pico ≥ 15mm/día", "Ninguno: por debajo de eso",
            ],
            "en": [
                "Severe: peak ≥ 50mm/day, or 7-day total ≥ 90mm", "High: peak ≥ 35mm/day, or total ≥ 65mm",
                "Moderate: peak ≥ 25mm/day, or total ≥ 45mm", "Low: peak ≥ 15mm/day", "None: below that",
            ],
        },
    },
]


def get_crop_reference(crop_id: str, lang: str = "es") -> Dict[str, Any]:
    """Assembles the full read-only reference sheet for one crop: the real
    GDD model parameters, real per-stage thresholds, the stress severity
    methodology (with this crop's actual threshold values substituted in),
    and which recommended products respond to which stress type."""
    crop_info = phenology_engine.database.get(crop_id)
    if crop_info is None:
        raise ValueError(f"Unknown crop_id '{crop_id}'")

    es = lang == "es"
    stages = crop_info["stages"]
    frost_thresh = crop_info.get("t_frost_crit", -2.0)

    stage_list = []
    prev_pct = 0.0
    for stg in stages:
        stage_list.append({
            "name": stg["name_es"] if es and stg.get("name_es") else stg["name"],
            "bbch": stg["bbch"],
            "phase": stg.get("phase", "germination"),
            "gdd_range_pct": [round(prev_pct * 100, 1), round(stg["gdd_pct"] * 100, 1)],
            "heat_threshold_c": stg["heat_threshold"],
            "vpd_max_threshold_kpa": stg["vpd_max_threshold"],
        })
        prev_pct = stg["gdd_pct"]

    # Substitute this crop's real numbers into the generic methodology text,
    # per stress type, so "Moderado: máxima ≥ umbral" reads as an actual
    # number for THIS crop rather than staying abstract.
    methodology = []
    for entry in STRESS_METHODOLOGY:
        item = {
            "stress_type": entry["stress_type"],
            "title": entry["title"]["es" if es else "en"],
            "measures": entry["measures"]["es" if es else "en"],
            "threshold_source": entry["threshold_source"]["es" if es else "en"],
            "breakpoints": entry["breakpoints"]["es" if es else "en"],
        }
        if entry["stress_type"] == "frost":
            item["this_crop_value"] = f"{frost_thresh}°C"
        elif entry["stress_type"] in ("heat", "high_vpd"):
            # Varies by stage - list each stage's value instead of one number.
            unit = "°C" if entry["stress_type"] == "heat" else "kPa"
            key = "heat_threshold_c" if entry["stress_type"] == "heat" else "vpd_max_threshold_kpa"
            item["this_crop_value_by_stage"] = [
                {"stage": s["name"], "value": f"{s[key]}{unit}"} for s in stage_list
            ]
        methodology.append(item)

        # Which products this panel should list under each stress type.
        products_for_type = [
            p for p in recommendation_engine.products if entry["stress_type"] in p.get("target_stresses", [])
        ]
        item["recommended_products"] = [
            {
                "name": recommendation_engine._localized(p, "name", lang),
                "category": recommendation_engine._localized(p, "category", lang),
                "dosage": recommendation_engine._localized(p, "dosage", lang),
                "application_window": recommendation_engine._localized(p, "application_window", lang),
                "scientific_rationale": recommendation_engine._localized(p, "scientific_rationale", lang),
            }
            for p in products_for_type
        ]

    return {
        "crop_id": crop_id,
        "crop_name": crop_info["name_es"] if es and crop_info.get("name_es") else crop_info["name"],
        "scientific_name": crop_info["scientific_name"],
        "gdd_model": {
            "t_base_c": crop_info["t_base"],
            "t_opt_c": crop_info["t_opt"],
            "total_gdd_required": crop_info["total_gdd"],
            "maturity_multipliers": crop_info.get("maturity_varieties", {}),
            "formula_note": (
                "GDD diario = ((min(Temp.Máx, T.Óptima) + max(Temp.Mín, T.Base)) / 2) − T.Base, con piso en 0. "
                "Se acumula día a día desde la siembra hasta alcanzar el GDD total requerido (ajustado por variedad)."
                if es else
                "Daily GDD = ((min(Temp.Max, T.Opt) + max(Temp.Min, T.Base)) / 2) − T.Base, floored at 0. "
                "Accumulated day by day from planting until the total required GDD (adjusted by maturity variety) is reached."
            ),
            "unused_field_note": (
                "El dato t_max existe en la base de cultivos pero el motor actual no lo usa en ningún cálculo."
                if es else
                "The t_max field exists in the crop database but isn't used anywhere in the current calculation."
            ),
            "not_modeled_note": (
                "Fotoperíodo y vernalización NO forman parte del modelo actual — el avance depende únicamente de temperatura acumulada (GDD)."
                if es else
                "Photoperiod and vernalization are NOT part of the current model - progression depends solely on accumulated temperature (GDD)."
            ),
        },
        "stages": stage_list,
        "stress_methodology": methodology,
    }
