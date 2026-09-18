import React from "react";
import { Sprout, Leaf, Flower2, Wheat, PackageCheck } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Maps a stage's language-independent `phase` (assigned once per crop in
 * crops_database.json, not guessed from the stage name text) to an icon and
 * a translation key, so every crop - grain, tuber, or cane - reads on the
 * same five-icon visual language regardless of which language the stage
 * name itself is displayed in.
 *
 * Previously this was inferred by regex-matching English keywords in the
 * stage's own name (e.g. "flower", "ripen") - which silently broke for
 * every stage once the name was localized to Spanish, since none of those
 * English patterns ever matched the translated text, so every stage fell
 * through to the same default. Backing this off a fixed per-stage field is
 * immune to that by construction.
 */
const PHASE_ICON = {
  germination: { Icon: Sprout, key: "phaseGermination" },
  growth: { Icon: Leaf, key: "phaseGrowth" },
  flowering: { Icon: Flower2, key: "phaseFlowering" },
  filling: { Icon: Wheat, key: "phaseFilling" },
  ripening: { Icon: PackageCheck, key: "phaseRipening" },
};

function phaseForStage(phase) {
  return PHASE_ICON[phase] || PHASE_ICON.germination;
}

/**
 * Illustrated BBCH stage timeline. Nodes sit at the GDD% midpoint of the
 * span they cover (not evenly spaced), so the diagram itself communicates
 * how much of the season each phase actually takes - e.g. a long vegetative
 * stage reads as a long stretch of track, not the same width as a short one.
 */
export function PhenologyTimeline({ stages, progressPct }) {
  const { t } = useLanguage();
  if (!stages || stages.length === 0) return null;

  let prevPct = 0;
  const positioned = stages.map(stg => {
    const start = prevPct;
    const end = stg.gdd_pct;
    prevPct = end;
    return { ...stg, start, mid: (start + end) / 2 };
  });

  const currentIdx = positioned.findIndex(s => s.is_current);
  const fillPct = currentIdx >= 0 ? positioned[currentIdx].end ?? positioned[currentIdx].gdd_pct : 0;

  return (
    <div style={{ position: "relative", padding: "1.75rem 1rem 0.25rem" }}>

      {/* "You are here" marker at the exact GDD% within the current phase,
          separate from the stage nodes themselves. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: `${Math.min(99, Math.max(1, progressPct))}%`,
          top: 0,
          transform: "translateX(-50%)",
          width: "10px", height: "10px",
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 0 0 4px rgba(16,185,129,0.35), 0 0 8px rgba(255,255,255,0.6)"
        }}
      />

      {/* Track */}
      <div style={{ position: "relative", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", marginTop: "0.6rem" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${fillPct}%`,
          background: "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)",
          borderRadius: "9999px",
          boxShadow: "0 0 10px rgba(16,185,129,0.5)",
          transition: "width 0.6s ease"
        }} />
      </div>

      {/* Stage nodes + labels */}
      <div style={{ position: "relative", marginTop: "-15px" }}>
        {positioned.map((stg, idx) => {
          const { Icon, key: phaseKey } = phaseForStage(stg.phase);
          const state = stg.is_current ? "current" : stg.is_completed ? "done" : "upcoming";
          return (
            <div
              key={idx}
              title={`BBCH ${stg.bbch}: ${stg.name}`}
              style={{
                position: "absolute",
                left: `${stg.mid}%`,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "84px"
              }}
            >
              <div style={{
                width: state === "current" ? "34px" : "26px",
                height: state === "current" ? "34px" : "26px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: state === "upcoming" ? "rgba(0,0,0,0.25)" : state === "current" ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.12)",
                border: state === "current" ? "2px solid #10b981" : state === "done" ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.15)",
                boxShadow: state === "current" ? "0 0 14px rgba(16,185,129,0.55)" : "none",
                transition: "all 0.3s ease",
                flexShrink: 0
              }}>
                <Icon
                  size={state === "current" ? 17 : 13}
                  color={state === "upcoming" ? "var(--text-subtle)" : state === "current" ? "#10b981" : "rgba(16,185,129,0.75)"}
                  strokeWidth={state === "current" ? 2.4 : 2}
                />
              </div>
              <div style={{
                marginTop: "0.4rem",
                textAlign: "center",
                fontSize: state === "current" ? "0.72rem" : "0.68rem",
                fontWeight: state === "current" ? "700" : "500",
                color: state === "current" ? "#ffffff" : state === "upcoming" ? "var(--text-subtle)" : "var(--text-muted)",
                lineHeight: 1.25,
                whiteSpace: "nowrap"
              }}>
                {t(`phenology.${phaseKey}`)}
              </div>
              <div style={{ fontSize: "0.62rem", color: "var(--text-subtle)", marginTop: "0.1rem" }}>
                BBCH {stg.bbch}
              </div>
            </div>
          );
        })}
      </div>

      {/* Spacer so the absolutely-positioned labels below the track still
          push the card's own layout down by their real height. */}
      <div style={{ height: "58px" }} />
    </div>
  );
}
