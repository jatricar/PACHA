import React, { useState } from "react";
import { X, Navigation, Upload, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { LocationMapPicker } from "./LocationMapPicker";

const CROP_IDS_IN_ORDER = [
  "maize", "sugarcane", "wheat", "rice", "potato",
  "sugar_beet", "soybean", "cassava", "oil_palm", "barley"
];

const CROP_ICONS = {
  maize: "🌽", sugarcane: "🎋", wheat: "🌾", rice: "🍚", potato: "🥔",
  sugar_beet: "🍠", soybean: "🫘", cassava: "🥔", oil_palm: "🌴", barley: "🌾"
};

export function FieldModal({ isOpen, onClose, onSubmitField, onBatchUpload }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("single");
  const [formData, setFormData] = useState({
    name: "Field Alpha",
    latitude: 41.8781,
    longitude: -87.6298,
    crop_id: "maize",
    variety: "Pioneer 1197",
    maturity_class: "medium",
    planting_date: "2026-05-10"
  });

  const [geoLocating, setGeoLocating] = useState(false);
  const [csvText, setCsvText] = useState("");

  if (!isOpen) return null;

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setGeoLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData(prev => ({
            ...prev,
            latitude: parseFloat(pos.coords.latitude.toFixed(4)),
            longitude: parseFloat(pos.coords.longitude.toFixed(4))
          }));
          setGeoLocating(false);
        },
        () => {
          alert(t("fieldModal.gpsError"));
          setGeoLocating(false);
        }
      );
    } else {
      alert(t("fieldModal.gpsUnsupported"));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitField(formData);
    onClose();
  };

  const handleBatchSubmit = (e) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    const lines = csvText.trim().split("\n");
    const fieldsParsed = [];
    for (let line of lines) {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length >= 5) {
        fieldsParsed.push({
          name: parts[0] || "Imported Field",
          latitude: parseFloat(parts[1]),
          longitude: parseFloat(parts[2]),
          crop_id: parts[3].toLowerCase(),
          planting_date: parts[4],
          variety: parts[5] || "Standard Hybrid",
          maturity_class: parts[6] || "medium"
        });
      }
    }
    if (fieldsParsed.length > 0) {
      onBatchUpload(fieldsParsed);
      onClose();
    } else {
      alert(t("fieldModal.batchInvalid"));
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(3, 7, 18, 0.75)",
      backdropFilter: "blur(8px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div className="glass-card" style={{ width: "100%", maxWidth: "600px", padding: "1.5rem", borderRadius: "20px" }}>

        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#ffffff" }}>{t("fieldModal.title")}</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t("fieldModal.subtitle")}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", background: "rgba(255,255,255,0.05)", padding: "0.25rem", borderRadius: "10px" }}>
          <button
            onClick={() => setActiveTab("single")}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "single" ? "var(--primary-emerald)" : "transparent",
              color: activeTab === "single" ? "#ffffff" : "var(--text-muted)",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            {t("fieldModal.tabSingle")}
          </button>
          <button
            onClick={() => setActiveTab("batch")}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "batch" ? "var(--primary-emerald)" : "transparent",
              color: activeTab === "batch" ? "#ffffff" : "var(--text-muted)",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            {t("fieldModal.tabBatch")}
          </button>
        </div>

        {activeTab === "single" ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Field Name */}
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>{t("fieldModal.fieldName")}</label>
              <input
                className="input-glass"
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Location: interactive map (search, click, or drag the pin) */}
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>{t("fieldModal.locationLabel")}</label>
              <LocationMapPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                onChange={(latitude, longitude) => setFormData(prev => ({ ...prev, latitude, longitude }))}
              />
            </div>

            {/* Coordinates fine-tune & GPS - stays in sync with the map above */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>{t("fieldModal.latitude")}</label>
                <input
                  className="input-glass"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>{t("fieldModal.longitude")}</label>
                <input
                  className="input-glass"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                className="btn-outline"
                style={{ padding: "0.6rem 0.8rem" }}
                title={t("fieldModal.gpsTitle")}
              >
                <Navigation size={16} />
                <span>{geoLocating ? t("fieldModal.gpsLocating") : t("fieldModal.gpsButton")}</span>
              </button>
            </div>

            {/* Crop Selector */}
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>{t("fieldModal.cropSpecies")}</label>
              <select
                className="input-glass"
                value={formData.crop_id}
                onChange={e => setFormData({ ...formData, crop_id: e.target.value })}
                style={{ background: "rgba(15, 23, 42, 0.95)" }}
              >
                {CROP_IDS_IN_ORDER.map(id => (
                  <option key={id} value={id}>
                    {CROP_ICONS[id]} {t(`crops.${id}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Variety & Maturity & Planting Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>{t("fieldModal.variety")}</label>
                <input
                  className="input-glass"
                  type="text"
                  value={formData.variety}
                  onChange={e => setFormData({ ...formData, variety: e.target.value })}
                  placeholder={t("fieldModal.varietyPlaceholder")}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>{t("fieldModal.maturityClass")}</label>
                <select
                  className="input-glass"
                  value={formData.maturity_class}
                  onChange={e => setFormData({ ...formData, maturity_class: e.target.value })}
                  style={{ background: "rgba(15, 23, 42, 0.95)" }}
                >
                  <option value="early">{t("fieldModal.maturityEarly")}</option>
                  <option value="medium">{t("fieldModal.maturityMedium")}</option>
                  <option value="late">{t("fieldModal.maturityLate")}</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>{t("fieldModal.plantingDate")}</label>
              <input
                className="input-glass"
                type="date"
                value={formData.planting_date}
                onChange={e => setFormData({ ...formData, planting_date: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn-emerald" style={{ marginTop: "0.5rem", justifyContent: "center" }}>
              <CheckCircle2 size={18} />
              <span>{t("fieldModal.submitButton")}</span>
            </button>

          </form>
        ) : (
          <form onSubmit={handleBatchSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>
                {t("fieldModal.batchLabel")}
              </label>
              <textarea
                className="input-glass"
                rows={6}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={t("fieldModal.batchPlaceholder")}
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
              />
            </div>
            <button type="submit" className="btn-emerald" style={{ justifyContent: "center" }}>
              <Upload size={18} />
              <span>{t("fieldModal.batchSubmit")}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
