import React, { useState, useEffect } from "react";
import { ArrowLeft, Users, BarChart3, Loader2, Globe2, FolderOpen, BookOpen } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchAdminUsers, fetchAdminUsageSummary, updateUserTier } from "../api/client";
import { WorldReportPanel } from "./WorldReportPanel";
import { AdminUserFieldsPanel } from "./AdminUserFieldsPanel";
import { AdminCropReferencePanel } from "./AdminCropReferencePanel";

export function AdminPage({ onClose }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("users");
  const [usersData, setUsersData] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [users, usage] = await Promise.all([fetchAdminUsers(), fetchAdminUsageSummary()]);
      setUsersData(users);
      setUsageData(usage);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTier = async (userId, currentTier) => {
    const newTier = currentTier === "premium" ? "free" : "premium";
    try {
      await updateUserTier(userId, newTier);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "1rem" }}>

      <div className="glass-card" style={{ padding: "0.85rem 1.5rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff" }}>{t("admin.title")}</h1>
        <button onClick={onClose} className="btn-outline">
          <ArrowLeft size={16} />
          <span>{t("admin.backToApp")}</span>
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setTab("users")}
          className={tab === "users" ? "btn-emerald" : "btn-outline"}
        >
          <Users size={16} />
          <span>{t("admin.usersTab")}</span>
        </button>
        <button
          onClick={() => setTab("usage")}
          className={tab === "usage" ? "btn-emerald" : "btn-outline"}
        >
          <BarChart3 size={16} />
          <span>{t("admin.usageTab")}</span>
        </button>
        <button
          onClick={() => setTab("worldreport")}
          className={tab === "worldreport" ? "btn-emerald" : "btn-outline"}
        >
          <Globe2 size={16} />
          <span>{t("admin.worldReportTab")}</span>
        </button>
        <button
          onClick={() => setTab("cropref")}
          className={tab === "cropref" ? "btn-emerald" : "btn-outline"}
        >
          <BookOpen size={16} />
          <span>{t("admin.cropRefTab")}</span>
        </button>
      </div>

      {tab === "worldreport" ? (
        <WorldReportPanel />
      ) : tab === "cropref" ? (
        <AdminCropReferencePanel />
      ) : loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <Loader2 size={32} className="animate-spin" color="#10b981" />
        </div>
      ) : errorMsg ? (
        <div className="glass-card" style={{ padding: "1rem", color: "#f43f5e" }}>{errorMsg}</div>
      ) : tab === "users" ? (
        <div className="glass-card" style={{ padding: "1rem", overflowX: "auto" }}>
          {usersData?.note && (
            <p style={{ fontSize: "0.8rem", color: "#d97706", marginBottom: "1rem" }}>{t("admin.noAuthNote")}</p>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "0.5rem" }}>{t("admin.colEmail")}</th>
                <th style={{ padding: "0.5rem" }}>{t("admin.colSignedUp")}</th>
                <th style={{ padding: "0.5rem" }}>{t("admin.colLastSignIn")}</th>
                <th style={{ padding: "0.5rem" }}>{t("admin.colFields")}</th>
                <th style={{ padding: "0.5rem" }}>{t("admin.colTier")}</th>
                <th style={{ padding: "0.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {usersData?.users?.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.5rem", color: "#ffffff" }}>{u.email}</td>
                  <td style={{ padding: "0.5rem", color: "var(--text-muted)" }}>{u.created_at ? u.created_at.slice(0, 10) : "-"}</td>
                  <td style={{ padding: "0.5rem", color: "var(--text-muted)" }}>{u.last_sign_in_at ? u.last_sign_in_at.slice(0, 10) : "-"}</td>
                  <td style={{ padding: "0.5rem", color: "var(--text-muted)" }}>{u.field_count}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <span style={{
                      padding: "0.15rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700",
                      background: u.tier === "premium" ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.15)",
                      color: u.tier === "premium" ? "#10b981" : "#94a3b8"
                    }}>
                      {u.tier}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button onClick={() => setSelectedUser(u)} className="btn-outline" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>
                        <FolderOpen size={13} />
                        <span>{t("adminFields.viewButton")}</span>
                      </button>
                      <button onClick={() => handleToggleTier(u.id, u.tier)} className="btn-outline" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>
                        {u.tier === "premium" ? t("admin.makeFree") : t("admin.makePremium")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
            <div className="glass-panel" style={{ padding: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t("admin.totalUsers")}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#ffffff" }}>{usageData?.total_users}</div>
            </div>
            <div className="glass-panel" style={{ padding: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t("admin.totalFields")}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#ffffff" }}>{usageData?.total_fields}</div>
            </div>
            <div className="glass-panel" style={{ padding: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t("admin.totalEvents")}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#ffffff" }}>{usageData?.total_events}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "#ffffff", marginBottom: "0.75rem" }}>{t("admin.eventsByType")}</h3>
            {Object.entries(usageData?.events_by_type || {}).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>{k}</span>
                <span style={{ color: "#ffffff", fontWeight: "700" }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "#ffffff", marginBottom: "0.75rem" }}>{t("admin.topCrops")}</h3>
            {Object.entries(usageData?.top_crops || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>{t(`crops.${k}`) !== `crops.${k}` ? t(`crops.${k}`) : k}</span>
                <span style={{ color: "#ffffff", fontWeight: "700" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedUser && (
        <AdminUserFieldsPanel user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

    </div>
  );
}
