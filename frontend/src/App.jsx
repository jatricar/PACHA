import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { FieldModal } from "./components/FieldModal";
import { PhenologyGauge } from "./components/PhenologyGauge";
import { StressRiskRadar } from "./components/StressRiskRadar";
import { WeatherCharts } from "./components/WeatherCharts";
import { RecommendationCard } from "./components/RecommendationCard";
import { SavedFieldsBar } from "./components/SavedFieldsBar";
import { fetchSavedFields, createField, deleteField, analyzeAdhocStress } from "./api/client";
import { AlertCircle, Loader2 } from "lucide-react";

export default function App() {
  const [savedFields, setSavedFields] = useState([]);
  const [activeField, setActiveField] = useState({
    name: "Iowa Maize Demonstration Field",
    latitude: 41.8781,
    longitude: -87.6298,
    crop_id: "maize",
    variety: "Pioneer 1197",
    maturity_class: "medium",
    planting_date: "2026-05-10"
  });

  const [stressData, setStressData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load saved fields from API on initial mount
  useEffect(() => {
    loadSavedFields();
  }, []);

  // Run stress analysis whenever activeField changes
  useEffect(() => {
    if (activeField) {
      runAnalysis(activeField);
    }
  }, [activeField]);

  const loadSavedFields = async () => {
    try {
      const fields = await fetchSavedFields();
      setSavedFields(fields);
      if (fields.length > 0 && !activeField.id) {
        setActiveField(fields[0]);
      }
    } catch (err) {
      console.warn("Backend API offline or initial fields empty.");
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
        maturity_class: fieldParams.maturity_class
      });
      setStressData(data);
    } catch (err) {
      setErrorMsg("Failed to connect to Abiotic Stress Backend API. Make sure FastAPI service is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateField = async (newFieldData) => {
    try {
      const saved = await createField(newFieldData);
      setSavedFields(prev => [saved, ...prev]);
      setActiveField(saved);
    } catch (err) {
      // Fallback if API offline
      setActiveField(newFieldData);
    }
  };

  const handleBatchUpload = async (fieldsArray) => {
    for (let f of fieldsArray) {
      try {
        await createField(f);
      } catch (err) {}
    }
    await loadSavedFields();
    if (fieldsArray.length > 0) {
      setActiveField(fieldsArray[0]);
    }
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await deleteField(fieldId);
      setSavedFields(prev => prev.filter(f => f.id !== fieldId));
    } catch (err) {}
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "2rem" }}>
      
      {/* Navigation Header */}
      <Navbar
        onOpenNewFieldModal={() => setIsModalOpen(true)}
        onRefresh={() => runAnalysis(activeField)}
        isLoading={isLoading}
      />

      {/* Saved Fields Quick Bar */}
      <SavedFieldsBar
        savedFields={savedFields}
        activeFieldId={activeField?.id}
        onSelectField={(f) => setActiveField(f)}
        onDeleteField={handleDeleteField}
      />

      {/* Error Alert Banner if Backend Unreachable */}
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
            Querying 3-Source Forecast Ensemble, ERA5 Historical Climate, and GDD Phenology...
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
                  ? "El pronóstico y el histórico climático no se pudieron obtener en vivo (sin conexión a Open-Meteo / MET Norway / NWS / ERA5). Se muestra una estimación sintética basada en latitud — no es clima real."
                  : stressData.weather_data_source === "synthetic_fallback"
                  ? "El pronóstico de 7 días no se pudo obtener en vivo. Se muestra una estimación sintética basada en latitud — no es clima real."
                  : "El histórico climático (ERA5) no se pudo obtener en vivo. Se muestra una estimación sintética basada en latitud — no es clima histórico real."}
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
              <span>Pronóstico en vivo, pero solo 1 de las 3 fuentes meteorológicas respondió para esta ubicación (normal fuera de EE.UU., donde NWS no cubre).</span>
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
