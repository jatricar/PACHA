import React, { useState, useEffect, useRef } from "react";
import { Globe2, Loader2, Download, AlertTriangle, RefreshCw } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { startWorldReport, fetchWorldReportStatus } from "../api/client";
import { useCollapsible } from "../hooks/useCollapsible";
import { CollapseToggleButton, CollapsibleBody, CollapsibleHeader } from "./CollapsibleSection";

const POLL_INTERVAL_MS = 4000;

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function CropSection({ cropId, stations, t }) {
  const [expanded, setExpanded] = useCollapsible(`worldreport_${cropId}`, false);
  const cropLabel = t(`crops.${cropId}`) !== `crops.${cropId}` ? t(`crops.${cropId}`) : cropId;

  return (
    <div className="glass-card" style={{ padding: "1rem", marginBottom: "0.85rem" }}>
      <CollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded(x => !x)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
          {cropLabel} <span style={{ color: "var(--text-muted)", fontWeight: "400" }}>({stations.length})</span>
        </h3>
        <CollapseToggleButton expanded={expanded} onToggle={() => setExpanded(x => !x)} />
      </CollapsibleHeader>

      <CollapsibleBody expanded={expanded}>
        <div style={{ overflowX: "auto", marginTop: "0.85rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "0.4rem" }}>{t("worldReport.colStation")}</th>
                <th style={{ padding: "0.4rem" }}>{t("worldReport.colCountry")}</th>
                <th style={{ padding: "0.4rem" }}>{t("worldReport.colMaturity")}</th>
                <th style={{ padding: "0.4rem" }}>{t("worldReport.colTopRisks")}</th>
                <th style={{ padding: "0.4rem" }}>{t("worldReport.colProducts")}</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s, i) => {
                const m = s.maturity_summary?.typical_days_to_maturity;
                const allRisks = (s.stage_summary || []).flatMap(stg =>
                  (stg.risks || []).map(r => ({ ...r, stage: stg.name }))
                ).sort((a, b) => b.exceedance_pct - a.exceedance_pct).slice(0, 3);

                return (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.4rem", color: "#ffffff" }}>
                      {s.station_name}
                      {s.is_real_field && (
                        <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "#10b981", fontWeight: "700" }}>
                          {t("worldReport.realFieldTag")}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.4rem", color: "var(--text-muted)" }}>{s.country || "—"}</td>
                    <td style={{ padding: "0.4rem", color: "var(--text-muted)" }}>
                      {m?.median != null ? t("worldReport.daysValue", { n: m.median, min: m.min, max: m.max }) : "—"}
                    </td>
                    <td style={{ padding: "0.4rem" }}>
                      {allRisks.length === 0 ? (
                        <span style={{ color: "var(--text-subtle)" }}>{t("worldReport.noRisks")}</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                          {allRisks.map((r, j) => (
                            <span key={j} title={r.stage} style={{ color: "var(--text-muted)" }}>
                              {r.title}: <strong style={{ color: "#f59e0b" }}>{r.exceedance_pct}%</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "0.4rem", color: "var(--text-muted)" }}>
                      {(s.recommended_products || []).slice(0, 2).map(p => p.product_name).join(" · ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CollapsibleBody>
    </div>
  );
}

export function WorldReportPanel() {
  const { t, lang } = useLanguage();
  const [job, setJob] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const poll = async () => {
    try {
      const status = await fetchWorldReportStatus();
      setJob(status);
      if (status.status !== "running") stopPolling();
    } catch (err) {
      setErrorMsg(err.message);
      stopPolling();
    }
  };

  useEffect(() => {
    // Resume showing progress/results if a job was already started earlier
    // in this session (e.g. the admin navigated away and came back).
    poll();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    setErrorMsg(null);
    try {
      await startWorldReport(lang);
      poll();
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDownload = () => {
    if (job?.result) {
      downloadJson(job.result, `pacha_world_report_${job.result.generated_at?.slice(0, 10) || "latest"}.json`);
    }
  };

  const isRunning = job?.status === "running";
  const byCrop = job?.result?.by_crop || {};
  const cropOrder = ["wheat", "barley", "maize", "rice", "soybean", "potato", "sugar_beet", "sugarcane", "cassava", "oil_palm"];
  const orderedCropIds = [...cropOrder.filter(c => byCrop[c]), ...Object.keys(byCrop).filter(c => !cropOrder.includes(c))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#ffffff", margin: "0 0 0.3rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Globe2 size={18} color="#06b6d4" />
              {t("worldReport.title")}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, maxWidth: "560px" }}>
              {t("worldReport.description")}
            </p>
          </div>
          <button onClick={handleGenerate} disabled={isRunning} className="btn-emerald">
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            <span>{isRunning ? t("worldReport.running") : t("worldReport.generateButton")}</span>
          </button>
        </div>

        {isRunning && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              <span>{t("worldReport.progressLabel", { done: job.completed || 0, total: job.total || "?" })}</span>
            </div>
            <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: job.total ? `${Math.round(100 * job.completed / job.total)}%` : "5%",
                background: "linear-gradient(90deg, #10b981, #06b6d4)",
                transition: "width 0.4s ease"
              }} />
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "0.5rem" }}>
              {t("worldReport.patienceNote")}
            </p>
          </div>
        )}

        {job?.status === "error" && (
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", color: "#f43f5e", fontSize: "0.82rem" }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{job.error}</span>
          </div>
        )}
        {errorMsg && (
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", color: "#f43f5e", fontSize: "0.82rem" }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {job?.status === "done" && job.result && (
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--text-subtle)", margin: 0 }}>
              {t("worldReport.summaryLine", {
                ok: job.result.successful_stations,
                total: job.result.total_stations,
                date: job.result.generated_at?.slice(0, 10)
              })}
              {job.result.failed_stations > 0 && (
                <span style={{ color: "#f59e0b" }}> · {t("worldReport.failedNote", { n: job.result.failed_stations })}</span>
              )}
            </p>
            <button onClick={handleDownload} className="btn-outline">
              <Download size={16} />
              <span>{t("worldReport.downloadButton")}</span>
            </button>
          </div>
        )}
      </div>

      {job?.status === "done" && job.result && orderedCropIds.map(cropId => (
        <CropSection key={cropId} cropId={cropId} stations={byCrop[cropId]} t={t} />
      ))}

    </div>
  );
}
