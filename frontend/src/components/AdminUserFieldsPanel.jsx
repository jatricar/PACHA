import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Activity, Loader2, MapPin, Pencil } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchUserFields, createFieldForUser, deleteField, renameField, analyzeFieldById } from "../api/client";
import { FieldModal } from "./FieldModal";
import { PhenologyGauge } from "./PhenologyGauge";
import { StressRiskRadar } from "./StressRiskRadar";
import { WeatherCharts } from "./WeatherCharts";
import { RecommendationCard } from "./RecommendationCard";

/**
 * Lets the admin view, add, delete, and run a full analysis on any user's
 * saved fields - for when a colleague asks the admin to do this for them
 * instead of doing it themselves. Reuses the exact same dashboard
 * components (PhenologyGauge, StressRiskRadar, etc.) the main app uses, fed
 * by the same /stress/analyze/field/{id} endpoint (now admin-accessible),
 * so "what the admin sees here" and "what the user would see themselves"
 * are guaranteed to match.
 */
export function AdminUserFieldsPanel({ user, onClose }) {
  const { t, lang } = useLanguage();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const loadFields = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      setFields(await fetchUserFields(user.id));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const handleAddField = async (fieldData) => {
    await createFieldForUser(user.id, fieldData);
    setShowAddModal(false);
    loadFields();
  };

  const handleDelete = async (fieldId) => {
    if (!window.confirm(t("adminFields.confirmDelete"))) return;
    await deleteField(fieldId);
    if (activeFieldId === fieldId) { setActiveFieldId(null); setAnalysis(null); }
    loadFields();
  };

  const handleRename = async (field) => {
    const newName = window.prompt(t("adminFields.renamePrompt"), field.name);
    if (!newName || !newName.trim() || newName.trim() === field.name) return;
    await renameField(field.id, newName.trim());
    loadFields();
  };

  const handleViewAnalysis = async (fieldId) => {
    if (activeFieldId === fieldId) { setActiveFieldId(null); setAnalysis(null); return; }
    setActiveFieldId(fieldId);
    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisLoading(true);
    try {
      setAnalysis(await analyzeFieldById(fieldId, lang));
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "1.5rem", overflowY: "auto"
    }}>
      <div className="glass-card" style={{ width: "100%", maxWidth: "800px", padding: "1.5rem", borderRadius: "20px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
              {t("adminFields.title")}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>{user.email}</p>
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: "0.5rem" }}>
            <X size={18} />
          </button>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-emerald" style={{ marginBottom: "1.25rem" }}>
          <Plus size={16} />
          <span>{t("adminFields.addButton")}</span>
        </button>

        {errorMsg && <div style={{ color: "#f43f5e", fontSize: "0.85rem", marginBottom: "1rem" }}>{errorMsg}</div>}

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}><Loader2 className="animate-spin" size={24} /></div>
        ) : fields.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{t("adminFields.noFields")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {fields.map(f => (
              <div key={f.id}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)",
                  borderRadius: "10px", padding: "0.75rem 1rem"
                }}>
                  <div>
                    <div style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.9rem" }}>{f.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      {t(`crops.${f.crop_id}`) !== `crops.${f.crop_id}` ? t(`crops.${f.crop_id}`) : f.crop_id}
                      {" · "}{f.planting_date}
                      {" · "}<MapPin size={11} />{f.latitude.toFixed(2)}, {f.longitude.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <button onClick={() => handleRename(f)} className="btn-outline" style={{ padding: "0.4rem 0.7rem" }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleViewAnalysis(f.id)} className="btn-outline" style={{ padding: "0.4rem 0.7rem", fontSize: "0.78rem" }}>
                      <Activity size={14} />
                      <span>{activeFieldId === f.id ? t("adminFields.hideAnalysis") : t("adminFields.viewAnalysis")}</span>
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="btn-outline" style={{ padding: "0.4rem 0.7rem", color: "#f43f5e", borderColor: "rgba(244,63,94,0.35)" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {activeFieldId === f.id && (
                  <div style={{ marginTop: "0.6rem", paddingLeft: "0.5rem", borderLeft: "2px solid rgba(16,185,129,0.3)", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    {analysisLoading ? (
                      <div style={{ textAlign: "center", padding: "1.5rem" }}><Loader2 className="animate-spin" size={20} /></div>
                    ) : analysisError ? (
                      <div style={{ color: "#f43f5e", fontSize: "0.82rem" }}>{analysisError}</div>
                    ) : analysis ? (
                      <>
                        <PhenologyGauge phenology={analysis.phenology} />
                        <StressRiskRadar stresses={analysis.stresses} />
                        <WeatherCharts forecast7days={analysis.forecast_7days} historicalBaseline={analysis.historical_baseline} />
                        <RecommendationCard recommendations={analysis.recommendations} fieldInfo={analysis.field_info} />
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <FieldModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmitField={handleAddField}
      />
    </div>
  );
}
