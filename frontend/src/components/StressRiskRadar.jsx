import React from "react";
import { ThermometerSun, Snowflake, Wind, CloudRain, Droplets, ShieldAlert } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { useCollapsible } from "../hooks/useCollapsible";
import { CollapseToggleButton, CollapsibleBody, CollapsibleHeader } from "./CollapsibleSection";

export function StressRiskRadar({ stresses }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useCollapsible("stress", true);
  if (!stresses || stresses.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case "heat": return <ThermometerSun size={20} color="#f43f5e" />;
      case "frost": return <Snowflake size={20} color="#3b82f6" />;
      case "high_vpd": return <Wind size={20} color="#f59e0b" />;
      case "low_vpd": return <Droplets size={20} color="#06b6d4" />;
      case "drought": return <ShieldAlert size={20} color="#eab308" />;
      case "waterlogging": return <CloudRain size={20} color="#a855f7" />;
      default: return <ThermometerSun size={20} color="#10b981" />;
    }
  };

  const getBadgeClass = (sev) => {
    switch (sev) {
      case "Severe": return "badge badge-severe";
      case "High": return "badge badge-high";
      case "Moderate": return "badge badge-moderate";
      case "Low": return "badge badge-low";
      default: return "badge badge-none";
    }
  };

  const getProgressColor = (sev) => {
    switch (sev) {
      case "Severe": return "#f43f5e";
      case "High": return "#f59e0b";
      case "Moderate": return "#3b82f6";
      case "Low": return "#10b981";
      default: return "#64748b";
    }
  };

  // Severity counts stay visible next to the title even when the section is
  // collapsed - a plain title alone would give no clue whether closing this
  // card is hiding something urgent.
  const severityCounts = stresses.reduce((acc, s) => {
    acc[s.severity] = (acc[s.severity] || 0) + 1;
    return acc;
  }, {});
  const severityOrder = ["Severe", "High", "Moderate", "Low"];

  return (
    <div className="glass-card" style={{ padding: "1.25rem" }}>

      <CollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded(x => !x)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}
      >
        <div>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#f43f5e", fontWeight: "700" }}>
            {t("stress.sectionTitle")}
          </span>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#ffffff", margin: "0.15rem 0" }}>
            {t("stress.matrixTitle")}
          </h2>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {severityOrder.filter(sev => severityCounts[sev]).map(sev => (
              <span key={sev} className={getBadgeClass(sev)}>{severityCounts[sev]} {sev}</span>
            ))}
          </div>
        </div>
        <CollapseToggleButton expanded={expanded} onToggle={() => setExpanded(x => !x)} />
      </CollapsibleHeader>

      <CollapsibleBody expanded={expanded}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {stresses.map((item, idx) => {
          const badgeCls = getBadgeClass(item.severity);
          const barColor = getProgressColor(item.severity);

          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                justify: "space-between",
                borderColor: item.severity === "Severe" || item.severity === "High" ? "rgba(244, 63, 94, 0.4)" : "var(--border-glass)"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ background: "rgba(255,255,255,0.05)", padding: "0.4rem", borderRadius: "8px" }}>
                      {getIcon(item.stress_type)}
                    </div>
                    <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "#ffffff" }}>
                      {item.title}
                    </span>
                  </div>
                  <span className={badgeCls}>{item.severity}</span>
                </div>

                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.8rem", lineHeight: "1.4" }}>
                  {item.trigger_reason}
                </div>
              </div>

              <div>
                {/* Metric & Threshold badges */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-subtle)", marginBottom: "0.3rem" }}>
                  <span>{item.observed_metric}</span>
                  <span>{item.critical_threshold}</span>
                </div>

                {/* Score Progress Bar */}
                <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
                  <div style={{
                    width: `${item.score}%`,
                    height: "100%",
                    background: barColor,
                    borderRadius: "9999px"
                  }} />
                </div>
              </div>

            </div>
          );
        })}
      </div>
      </CollapsibleBody>

    </div>
  );
}
