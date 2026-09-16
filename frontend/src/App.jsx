import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { FieldModal } from "./components/FieldModal";
import { PhenologyGauge } from "./components/PhenologyGauge";
import { StressRiskRadar } from "./components/StressRiskRadar";
import { WeatherCharts } from "./components/WeatherCharts";
import { RecommendationCard } from "./components/RecommendationCard";
import { SavedFieldsBar } from "./components/SavedFieldsBar";
import { LoginScreen } from "./components/LoginScreen";
import { AdminPage } from "./components/AdminPage";
import { fetchSavedFields, createField, deleteField, analyzeAdhocStress, fetchUsageSummary, fetchAdminUsers } from "./api/client";
import { AlertCircle, Loader2 } from "lucide-react";
import { useLanguage } from "./i18n/LanguageContext";
import { useAuth } from "./auth/AuthContext";

export default function App() {
  const { t, lang } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  const [savedFields, setSavedFields] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [usage, setUsage] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const [stressData, setStressData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Once signed in, load this user's own fields, usage quota, and check admin access.
  useEffect(() => {
    if (user) {
      loadSavedFields();
      loadUsage();
      checkAdminAccess();
    } else {
      // Signed out - clear everything from the previous session.
      setSavedFields([]);
      setActiveField(null);
      setStressData(null);
      setUsage(null);
      setIsAdmin(false);
      setShowAdmin(false);
    }
  }, [user]);

  // Run stress analysis whenever activeField changes - and re-run it when
  // the UI language changes too, since stage names, stress alerts and
  // recommendation text all come from the backend already translated for
  // the requested language, not translated client-side like static labels.
  useEffect(() => {
    if (activeField) {
      runAnalysis(activeField);
    }
  }, [activeField, lang]);

  const loadSavedFields = async () => {
    try {
      const fields = await fetchSavedFields();
      setSavedFields(fields);
      if (fields.length > 0) {
        setActiveField(fields[0]);
      } else {
        // No saved fields yet - show a demo example so the dashboard isn't empty.
        setActiveField({
          name: "Demo Field",
          latitude: 41.8781,
          longitude: -87.6298,
          crop_id: "maize",
          variety: "Pioneer 1197",
          maturity_class: "medium",
          planting_date: "2026-05-10"
        });
      }
    } catch (err) {
      console.warn("Could not load saved fields:", err.message);
    }
  };

  const loadUsage = async () => {
    try {
      const data = await fetchUsageSummary();
      setUsage(data);
    } catch (err) {
      console.warn("Could not load usage summary:", err.message);
    }
  };

  const checkAdminAccess = async () => {
    try {
      await fetchAdminUsers();
      setIsAdmin(true);
    } catch (err) {
      console.warn("Admin check failed (this is expected if your account isn't an admin):", err.message);
      setIsAdmin(false);
    }
  };

  const runAnalysis = async (fieldParams) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await analyzeAdhocStress({
        latitude: fieldParams.latitude,
        longitude: fieldParams.longitude,
        crop_id: fieldParams.crop_id,
        planting_date: fieldParams.planting_date,
        variety: fieldParams.variety,
        maturity_class: fieldParams.maturity_class,
        lang
      });
      setStressData(data);
    } catch (err) {
      setErrorMsg(t("app.connectionError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateField = async (newFieldData) => {
    try {
      const saved = await createField(newFieldData);
      setSavedFields(prev => [saved, ...prev]);
      setActiveField(saved);
      loadUsage();
    } catch (err) {
      if (err.status === 403) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(t("app.connectionError"));
      }
    }
  };

  const handleBatchUpload = async (fieldsArray) => {
    for (let f of fieldsArray) {
      try {
        await createField(f);
      } catch (err) {
        if (err.status === 403) {
          setErrorMsg(err.message);
          break; // stop uploading further once the plan limit is hit
        }
      }
    }
    await loadSavedFields();
    await loadUsage();
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await deleteField(fieldId);
      setSavedFields(prev => prev.filter(f => f.id !== fieldId));
      loadUsage();
    } catch (err) {}
  };

  // --- Auth gating ---
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} className="animate-spin" color="#10b981" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (showAdmin) {
    return <AdminPage onClose={() => setShowAdmin(false)} />;
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "2rem" }}>

      {/* Navigation Header */}
      <Navbar
        onOpenNewFieldModal={() => setIsModalOpen(true)}
        onRefresh={() => runAnalysis(activeField)}
        isLoading={isLoading}
        isAdmin={isAdmin}
        onOpenAdmin={() => setShowAdmin(true)}
      />

      {/* Saved Fields Quick Bar */}
      <SavedFieldsBar
        savedFields={savedFields}
        activeFieldId={activeField?.id}
        onSelectField={(f) => setActiveField(f)}
        onDeleteField={handleDeleteField}
        usage={usage}
      />

      {/* Error Alert Banner if Backend Unreachable / Plan Limit Reached */}
      {errorMsg && (
        <div style={{
          margin: "0 1rem 1rem 1rem",
          padding: "1rem",
          background: "rgba(244, 63, 94, 0.15)",
          border: "1px solid rgba(244, 63, 94, 0.3)",
          borderRadius: "12px",
          color: "#fda4af",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.9rem"
        }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", gap: "1rem" }}>
          <Loader2 size={40} className="animate-spin" color="#10b981" />
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            {t("app.loading")}
          </p>
        </div>
      ) : stressData ? (

        <main style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0 1rem" }}>

          {/* Data provenance banner: warns when weather/climate data is a
              synthetic estimate instead of live API data (e.g. no internet
              reach to Open-Meteo / MET Norway / NWS / ERA5 at request time) */}
          {(stressData.weather_data_source === "synthetic_fallback" ||
            stressData.historical_data_source === "synthetic_fallback") && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#78350f22",
              border: "1px solid #d97706",
              color: "#d97706",
              borderRadius: "8px",
              padding: "0.6rem 0.9rem",
              fontSize: "0.85rem"
            }}>
              <AlertCircle size={16} />
              <span>
                {stressData.weather_data_source === "synthetic_fallback" && stressData.historical_data_source === "synthetic_fallback"
                  ? t("app.weatherFallbackBoth")
                  : stressData.weather_data_source === "synthetic_fallback"
                  ? t("app.weatherFallbackForecast")
                  : t("app.weatherFallbackHistorical")}
              </span>
            </div>
          )}
          {stressData.weather_data_source === "partial_live" && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#1e3a8a22",
              border: "1px solid #3b82f6",
              color: "#3b82f6",
              borderRadius: "8px",
              padding: "0.6rem 0.9rem",
              fontSize: "0.85rem"
            }}>
              <AlertCircle size={16} />
              <span>{t("app.weatherPartialLive")}</span>
            </div>
          )}

          {/* Section 1: Crop Phenology & GDD Development */}
          <PhenologyGauge phenology={stressData.phenology} />

          {/* Section 2: Abiotic Stress Risk Matrix */}
          <StressRiskRadar stresses={stressData.stresses} />

          {/* Section 3: Weather Ensemble Forecast & Climate Baseline Charts */}
          <WeatherCharts
            forecast7days={stressData.forecast_7days}
            historicalBaseline={stressData.historical_baseline}
          />

          {/* Section 4: Anti-Stress Product Recommendations */}
          <RecommendationCard
            recommendations={stressData.recommendations}
            fieldInfo={stressData.field_info}
          />

        </main>

      ) : null}

      {/* New Field & Batch Upload Modal */}
      <FieldModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitField={handleCreateField}
        onBatchUpload={handleBatchUpload}
      />

    </div>
  );
}
