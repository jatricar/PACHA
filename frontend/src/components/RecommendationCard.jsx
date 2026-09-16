import React from "react";
import { Sparkles, FlaskConical, Clock, Printer } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { useCollapsible } from "../hooks/useCollapsible";
import { CollapseToggleButton, CollapsibleBody, CollapsibleHeader } from "./CollapsibleSection";

export function RecommendationCard({ recommendations, fieldInfo }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useCollapsible("recommendations", true);
  if (!recommendations || recommendations.length === 0) return null;

  const handlePrint = (e) => {
    e.stopPropagation(); // don't also toggle the section when printing
    window.print();
  };

  return (
    <div className="glass-card" style={{ padding: "1.25rem" }}>

      <CollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded(x => !x)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}
      >
        <div>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981", fontWeight: "700" }}>
            {t("recommendations.sectionTitle")}
          </span>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#ffffff", margin: "0.15rem 0" }}>
            {t("recommendations.title")}
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {t("recommendations.subtitle")} &middot; {t("recommendations.countBadge", { n: recommendations.length })}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button onClick={handlePrint} className="btn-outline no-print">
            <Printer size={16} />
            <span>{t("recommendations.printButton")}</span>
          </button>
          <CollapseToggleButton expanded={expanded} onToggle={() => setExpanded(x => !x)} />
        </div>
      </CollapsibleHeader>

      <CollapsibleBody expanded={expanded}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className="glass-panel"
            style={{
              padding: "1.25rem",
              borderLeft: "4px solid #10b981",
              background: "rgba(15, 23, 42, 0.85)"
            }}
          >

            {/* Title Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={18} color="#10b981" />
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>
                    {rec.product_name}
                  </h3>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#06b6d4", fontWeight: "600", textTransform: "uppercase", display: "inline-block", marginTop: "0.2rem" }}>
                  {rec.category} | Target: {rec.target_stress} ({rec.severity} Severity)
                </span>
              </div>

              <div style={{
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#6ee7b7",
                padding: "0.3rem 0.75rem",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: "600"
              }}>
                {t("recommendations.dosage")}: {rec.dosage}
              </div>
            </div>

            {/* Active Ingredients & Window */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.85rem" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#94a3b8", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.3rem" }}>
                  <FlaskConical size={14} />
                  <span>{t("recommendations.activeIngredients")}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {rec.active_ingredients?.map((ing, i) => (
                    <span key={i} style={{ background: "rgba(6, 182, 212, 0.15)", color: "#99f6e4", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#f59e0b", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.3rem" }}>
                  <Clock size={14} />
                  <span>{t("recommendations.applicationWindow")}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>
                  {rec.application_window}
                </div>
              </div>
            </div>

            {/* Biological Mode of Action */}
            <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", padding: "0.75rem 1rem", borderRadius: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "700", display: "block", marginBottom: "0.2rem" }}>
                {t("recommendations.rationale")}
              </span>
              <p style={{ fontSize: "0.825rem", color: "#cbd5e1", lineHeight: "1.45" }}>
                {rec.scientific_rationale}
              </p>
            </div>

          </div>
        ))}
      </div>
      </CollapsibleBody>

    </div>
  );
}
