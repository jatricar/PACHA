import React from "react";
import { Sparkles, FlaskConical, Clock, CheckCircle, Printer } from "lucide-react";

export function RecommendationCard({ recommendations, fieldInfo }) {
  if (!recommendations || recommendations.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="glass-card" style={{ padding: "1.25rem" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981", fontWeight: "700" }}>
            Agronomic Anti-Stress Action Plan
          </span>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#ffffff", margin: "0.15rem 0" }}>
            Scientifically Proved Anti-Stress Product Advisory
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Biostimulant & Nutritional Mitigants Tailored to Phenology Stage and Stress Severity
          </p>
        </div>

        <button onClick={handlePrint} className="btn-outline no-print">
          <Printer size={16} />
          <span>Print Advisory Report</span>
        </button>
      </div>

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
                Dosage: {rec.dosage}
              </div>
            </div>

            {/* Active Ingredients & Window */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.85rem" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#94a3b8", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.3rem" }}>
                  <FlaskConical size={14} />
                  <span>ACTIVE INGREDIENTS</span>
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
                  <span>APPLICATION WINDOW</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>
                  {rec.application_window}
                </div>
              </div>
            </div>

            {/* Biological Mode of Action */}
            <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", padding: "0.75rem 1rem", borderRadius: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "700", display: "block", marginBottom: "0.2rem" }}>
                SCIENTIFIC RATIONALE & BIOLOGICAL MODE OF ACTION:
              </span>
              <p style={{ fontSize: "0.825rem", color: "#cbd5e1", lineHeight: "1.45" }}>
                {rec.scientific_rationale}
              </p>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
