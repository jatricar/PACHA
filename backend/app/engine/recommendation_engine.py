import json
from typing import List, Dict, Any
from app.core.config import DATA_DIR

class AntiStressRecommendationEngine:
    def __init__(self):
        rules_file = DATA_DIR / "stress_rules.json"
        with open(rules_file, "r", encoding="utf-8") as f:
            self.products = json.load(f)["anti_stress_products"]

    def generate_recommendations(
        self,
        stresses: List[Dict[str, Any]],
        crop_id: str,
        phenology: Dict[str, Any]
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
                        "product_name": prod["name"],
                        "category": prod["category"],
                        "active_ingredients": prod["active_ingredients"],
                        "target_stress": str_item["title"],
                        "severity": severity,
                        "dosage": prod["dosage"],
                        "application_window": prod["application_window"],
                        "scientific_rationale": prod["scientific_rationale"]
                    })

        # Fallback maintenance advice if all stress levels are low
        if not recommendations:
            for prod in self.products[:2]:
                if prod["id"] not in seen_products:
                    recommendations.append({
                        "product_id": prod["id"],
                        "product_name": prod["name"],
                        "category": prod["category"],
                        "active_ingredients": prod["active_ingredients"],
                        "target_stress": "Preventative Maintenance",
                        "severity": "Low",
                        "dosage": "1.0 L/ha preventative spray",
                        "application_window": "Standard weekly agronomic maintenance window.",
                        "scientific_rationale": "Sustains baseline antioxidants and vascular health prior to stress onset."
                    })
                    break

        return recommendations

recommendation_engine = AntiStressRecommendationEngine()
