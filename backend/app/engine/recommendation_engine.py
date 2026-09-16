import json
from typing import List, Dict, Any
from app.core.config import DATA_DIR

class AntiStressRecommendationEngine:
    def __init__(self):
        rules_file = DATA_DIR / "stress_rules.json"
        with open(rules_file, "r", encoding="utf-8") as f:
            self.products = json.load(f)["anti_stress_products"]

    def _localized(self, prod: Dict[str, Any], field: str, lang: str):
        """Picks the Spanish-translated field from prod['es'] when lang=='es'
        and a translation exists, otherwise falls back to the English field -
        so a product missing a translation still renders instead of erroring."""
        if lang == "es":
            es_block = prod.get("es") or {}
            if field in es_block:
                return es_block[field]
        return prod[field]

    def generate_recommendations(
        self,
        stresses: List[Dict[str, Any]],
        crop_id: str,
        phenology: Dict[str, Any],
        lang: str = "en",
    ) -> List[Dict[str, Any]]:
        """Generate targeted anti-stress agricultural product recommendations based on active stresses."""
        recommendations = []
        seen_products = set()

        # Sort stresses by severity score descending
        active_stresses = [s for s in stresses if s["severity"] in ["Moderate", "High", "Severe"]]
        active_stresses.sort(key=lambda x: x["score"], reverse=True)

        for str_item in active_stresses:
            s_type = str_item["stress_type"]
            severity = str_item["severity"]

            for prod in self.products:
                if s_type in prod["target_stresses"] and prod["id"] not in seen_products:
                    seen_products.add(prod["id"])

                    recommendations.append({
                        "product_id": prod["id"],
                        "product_name": self._localized(prod, "name", lang),
                        "category": self._localized(prod, "category", lang),
                        "active_ingredients": self._localized(prod, "active_ingredients", lang),
                        "target_stress": str_item["title"],
                        "severity": severity,
                        "dosage": self._localized(prod, "dosage", lang),
                        "application_window": self._localized(prod, "application_window", lang),
                        "scientific_rationale": self._localized(prod, "scientific_rationale", lang)
                    })

        # Fallback maintenance advice if all stress levels are low
        if not recommendations:
            for prod in self.products[:2]:
                if prod["id"] not in seen_products:
                    es = lang == "es"
                    recommendations.append({
                        "product_id": prod["id"],
                        "product_name": self._localized(prod, "name", lang),
                        "category": self._localized(prod, "category", lang),
                        "active_ingredients": self._localized(prod, "active_ingredients", lang),
                        "target_stress": "Mantenimiento Preventivo" if es else "Preventative Maintenance",
                        "severity": "Low",
                        "dosage": "1.0 L/ha aplicación preventiva" if es else "1.0 L/ha preventative spray",
                        "application_window": "Ventana estándar de mantenimiento agronómico semanal." if es else "Standard weekly agronomic maintenance window.",
                        "scientific_rationale": "Sostiene los antioxidantes basales y la salud vascular antes del inicio del estrés." if es else "Sustains baseline antioxidants and vascular health prior to stress onset."
                    })
                    break

        return recommendations

recommendation_engine = AntiStressRecommendationEngine()
