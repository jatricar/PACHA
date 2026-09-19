import React, { useState, useEffect } from "react";
import { Sprout, Leaf, Flower2, Wheat, PackageCheck, Loader2, ChevronDown, Info } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchCropReference } from "../api/client";
import { CROP_IDS_IN_ORDER, CROP_ICONS } from "../constants/crops";

const PHASE_ICON = {
  germination: Sprout, growth: Leaf, flowering: Flower2, filling: Wheat, ripening: PackageCheck,
};

function InfoNote({ children }) {
  return (
    <div style={{
      display: "flex", gap: "0.5rem", alignItems: "flex-start",
      background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)",
      borderRadius: "8px", padding: "0.6rem 0.8rem", fontSize: "0.78rem", color: "var(--text-muted)"
    }}>
      <Info size={14} color="#3b82f6" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
      <span>{children}</span>
    </div>
  );
}

function StressMethodologyEntry({ entry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-card" style={{ padding: "0.85rem 1rem" }}>
      <div
        onClick={() => setExpanded(x => !x)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
      >
        <span style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.9rem" }}>{entry.title}</span>
        <ChevronDown size={16} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "var(--text-muted)" }} />
      </div>
      {expanded && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.8rem" }}>
          <p style={{ margin: 0, color: "var(--text-muted)" }}><strong style={{ color: "#ffffff" }}>Mide:</strong> {entry.measures}</p>
          <p style={{ margin: 0, color: "var(--text-muted)" }}><strong style={{ color: "#ffffff" }}>Umbral:</strong> {entry.threshold_source}</p>

          {entry.this_crop_value && (
            <p style={{ margin: 0, color: "#06b6d4" }}>Valor para este cultivo: <strong>{entry.this_crop_value}</strong></p>
          )}
          {entry.this_crop_value_by_stage && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {entry.this_crop_value_by_stage.map((s, i) => (
                <span key={i} style={{ fontSize: "0.72rem", background: "rgba(6,182,212,0.12)", color: "#06b6d4", padding: "0.15rem 0.5rem", borderRadius: "6px" }}>
                  {s.stage}: <strong>{s.value}</strong>
                </span>
              ))}
            </div>
          )}

          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--text-muted)" }}>
            {entry.breakpoints.map((b, i) => <li key={i}>{b}</li>)}
          </ul>

          {entry.recommended_products.length > 0 && (
            <div style={{ marginTop: "0.3rem" }}>
              <strong style={{ color: "#ffffff", fontSize: "0.78rem" }}>Recomendaciones asociadas:</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.4rem" }}>
                {entry.recommended_products.map((p, i) => (
                  <div key={i} style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "0.5rem 0.7rem" }}>
                    <div style={{ color: "#10b981", fontWeight: "600", fontSize: "0.78rem" }}>{p.name}</div>
                    <div style={{ color: "var(--text-subtle)", fontSize: "0.72rem", margin: "0.15rem 0" }}>{p.category} · {p.dosage}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{p.application_window}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminCropReferencePanel() {
  const { lang } = useLanguage();
  const [cropId, setCropId] = useState("wheat");
  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    fetchCropReference(cropId, lang)
      .then(data => { if (!cancelled) setRef(data); })
      .catch(err => { if (!cancelled) setErrorMsg(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cropId, lang]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      <div className="glass-card" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "700" }}>CULTIVO:</span>
        <select
          value={cropId}
          onChange={e => setCropId(e.target.value)}
          className="input-glass"
          style={{ width: "auto", minWidth: "220px" }}
        >
          {CROP_IDS_IN_ORDER.map(id => (
            <option key={id} value={id}>{CROP_ICONS[id]} {id}</option>
          ))}
        </select>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "2rem" }}><Loader2 className="animate-spin" size={24} /></div>}
      {errorMsg && <div style={{ color: "#f43f5e", fontSize: "0.85rem" }}>{errorMsg}</div>}

      {ref && !loading && (
        <>
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#ffffff", margin: "0 0 1rem" }}>
              {ref.crop_name} <span style={{ fontSize: "0.85rem", fontStyle: "italic", fontWeight: "400", color: "var(--text-muted)" }}>({ref.scientific_name})</span>
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
              <div className="glass-panel" style={{ padding: "0.7rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>TEMP. BASE</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>{ref.gdd_model.t_base_c}°C</div>
              </div>
              <div className="glass-panel" style={{ padding: "0.7rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>TEMP. ÓPTIMA</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>{ref.gdd_model.t_opt_c}°C</div>
              </div>
              <div className="glass-panel" style={{ padding: "0.7rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>GDD TOTAL REQ.</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>{ref.gdd_model.total_gdd_required}</div>
              </div>
              <div className="glass-panel" style={{ padding: "0.7rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>MULT. POR MADUREZ</div>
                <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff" }}>
                  {Object.entries(ref.gdd_model.maturity_multipliers).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                </div>
              </div>
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>{ref.gdd_model.formula_note}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <InfoNote>{ref.gdd_model.unused_field_note}</InfoNote>
              <InfoNote>{ref.gdd_model.not_modeled_note}</InfoNote>
            </div>
          </div>

          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", margin: "0 0 0.85rem" }}>Etapas Fenológicas</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ padding: "0.4rem" }}></th>
                    <th style={{ padding: "0.4rem" }}>Etapa</th>
                    <th style={{ padding: "0.4rem" }}>BBCH</th>
                    <th style={{ padding: "0.4rem" }}>% del ciclo (GDD)</th>
                    <th style={{ padding: "0.4rem" }}>Umbral calor</th>
                    <th style={{ padding: "0.4rem" }}>Umbral VPD</th>
                  </tr>
                </thead>
                <tbody>
                  {ref.stages.map((s, i) => {
                    const Icon = PHASE_ICON[s.phase] || Sprout;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "0.4rem" }}><Icon size={15} color="#10b981" /></td>
                        <td style={{ padding: "0.4rem", color: "#ffffff" }}>{s.name}</td>
                        <td style={{ padding: "0.4rem", color: "var(--text-muted)" }}>{s.bbch}</td>
                        <td style={{ padding: "0.4rem", color: "var(--text-muted)" }}>{s.gdd_range_pct[0]}–{s.gdd_range_pct[1]}%</td>
                        <td style={{ padding: "0.4rem", color: "var(--text-muted)" }}>{s.heat_threshold_c}°C</td>
                        <td style={{ padding: "0.4rem", color: "var(--text-muted)" }}>{s.vpd_max_threshold_kpa} kPa</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", margin: "0 0 0.75rem" }}>Metodología de Alertas de Estrés</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {ref.stress_methodology.map((entry, i) => <StressMethodologyEntry key={i} entry={entry} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
