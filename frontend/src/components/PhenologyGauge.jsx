import React from "react";
import { Calendar, Flame, Target, Award, DatabaseZap } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { PhenologyTimeline } from "./PhenologyTimeline";
import { useCollapsible } from "../hooks/useCollapsible";
import { CollapseToggleButton, CollapsibleBody, CollapsibleHeader } from "./CollapsibleSection";

export function PhenologyGauge({ phenology }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useCollapsible("phenology", true);
  if (!phenology) return null;

  const {
    crop_name,
    scientific_name,
    variety,
    planting_date,
    days_after_planting,
    accumulated_gdd,
    total_required_gdd,
    data_completeness_pct,
    progress_pct,
    current_stage,
    all_stages,
    projected_maturity_date,
    maturity_uncertain
  } = phenology;

  return (
    <div className="glass-card" style={{ padding: "1.25rem" }}>

      {/* Header - the whole row toggles the section; header content (crop,
          variety, harvest date) stays visible when collapsed as the card's
          compact summary. */}
      <CollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded(x => !x)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}
      >
        <div>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981", fontWeight: "700" }}>
            {t("phenology.sectionTitle")}
          </span>
          <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#ffffff", margin: "0.2rem 0" }}>
            {crop_name} <span style={{ fontSize: "0.9rem", fontStyle: "italic", fontWeight: "400", color: "var(--text-muted)" }}>({scientific_name})</span>
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {t("phenology.variety")}: <strong style={{ color: "#ffffff" }}>{variety}</strong> | {t("phenology.planted")}: <strong style={{ color: "#ffffff" }}>{planting_date}</strong> ({t("phenology.daysAgo", { n: days_after_planting })})
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div className="glass-panel" style={{ padding: "0.5rem 1rem", textAlign: "right" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>{t("phenology.harvestDate")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#06b6d4", fontWeight: "700", fontSize: "0.95rem" }}>
              <Calendar size={16} />
              <span>{maturity_uncertain || !projected_maturity_date ? t("phenology.harvestUncertain") : projected_maturity_date}</span>
            </div>
          </div>
          <CollapseToggleButton expanded={expanded} onToggle={() => setExpanded(x => !x)} />
        </div>
      </CollapsibleHeader>

      <CollapsibleBody expanded={expanded}>
      {/* Primary Phenology Metric Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>

        <div className="glass-panel" style={{ padding: "0.85rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f59e0b", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.25rem" }}>
            <Flame size={16} />
            <span>{t("phenology.accumulatedGdd")}</span>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#ffffff" }}>
            {accumulated_gdd} <span style={{ fontSize: "0.85rem", fontWeight: "400", color: "var(--text-muted)" }}>°C-days</span>
          </div>
          {typeof data_completeness_pct === "number" && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.35rem",
              fontSize: "0.7rem", color: data_completeness_pct >= 70 ? "#10b981" : data_completeness_pct >= 30 ? "#d97706" : "#ef4444"
            }}>
              <DatabaseZap size={12} />
              <span>{t("phenology.realWeatherPct", { pct: data_completeness_pct })}</span>
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: "0.85rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#3b82f6", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.25rem" }}>
            <Target size={16} />
            <span>{t("phenology.maturityGddReq")}</span>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#ffffff" }}>
            {total_required_gdd} <span style={{ fontSize: "0.85rem", fontWeight: "400", color: "var(--text-muted)" }}>°C-days</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "0.85rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.25rem" }}>
            <Award size={16} />
            <span>{t("phenology.currentStage")}</span>
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            BBCH {current_stage?.bbch}: {current_stage?.name}
          </div>
        </div>

      </div>

      {/* Progress Bar & Stage Timeline */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
          <span>{t("phenology.seasonProgress")}</span>
          <span style={{ color: "#10b981", fontWeight: "700" }}>{progress_pct}% {t("phenology.completed")}</span>
        </div>

        <div style={{
          width: "100%",
          height: "12px",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "9999px",
          overflow: "hidden",
          position: "relative",
          marginBottom: "1rem"
        }}>
          <div style={{
            width: `${progress_pct}%`,
            height: "100%",
            background: "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)",
            borderRadius: "9999px",
            boxShadow: "0 0 12px rgba(16, 185, 129, 0.6)",
            transition: "width 0.6s ease"
          }} />
        </div>

        {/* BBCH Stage Timeline - illustrated: icons per growth phase, positioned
            by how much of the season each stage actually spans, plus a "you
            are here" marker at the exact GDD% within the current phase. */}
        <PhenologyTimeline stages={all_stages} progressPct={progress_pct} />

      </div>
      </CollapsibleBody>

    </div>
  );
}
