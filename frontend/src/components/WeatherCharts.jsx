import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import { useLanguage } from "../i18n/LanguageContext";

export function WeatherCharts({ forecast7days, historicalBaseline }) {
  const { t } = useLanguage();
  if (!forecast7days || forecast7days.length === 0) return null;

  const chartData = forecast7days.map(day => {
    const monthNum = new Date(day.date).getMonth() + 1;
    const histData = historicalBaseline ? historicalBaseline[String(monthNum)] : null;

    return {
      date: day.date.slice(5), // MM-DD
      tempMax: day.temp_max,
      tempMin: day.temp_min,
      vpdMax: day.vpd_max,
      precipitation: day.precipitation,
      pet: day.pet,
      histTempMax: histData ? histData.hist_temp_max : day.temp_max - 2.0,
      histVpd: histData ? histData.hist_vpd_avg : day.vpd_max - 0.4
    };
  });

  return (
    <div className="glass-card" style={{ padding: "1.25rem" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#06b6d4", fontWeight: "700" }}>
            {t("weather.sectionTitle")}
          </span>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#ffffff", margin: "0.15rem 0" }}>
            {t("weather.chartsTitle")}
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {t("weather.sourcesNote")}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>

        {/* Chart 1: Temperature vs Historical Norms */}
        <div className="glass-panel" style={{ padding: "1rem" }}>
          <h3 style={{ fontSize: "0.9rem", color: "#ffffff", marginBottom: "0.75rem", fontWeight: "600" }}>
            {t("weather.tempChartTitle")}
          </h3>
          <div style={{ width: "100%", height: "220px" }}>
            <ResponsiveContainer>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit="°C" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="tempMax" name={t("weather.legendFcstMax")} stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tempMin" name={t("weather.legendFcstMin")} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="histTempMax" name={t("weather.legendHistMax")} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Water Balance & VPD */}
        <div className="glass-panel" style={{ padding: "1rem" }}>
          <h3 style={{ fontSize: "0.9rem", color: "#ffffff", marginBottom: "0.75rem", fontWeight: "600" }}>
            {t("weather.waterChartTitle")}
          </h3>
          <div style={{ width: "100%", height: "220px" }}>
            <ResponsiveContainer>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 11 }} unit="mm" />
                <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" tick={{ fontSize: 11 }} unit="kPa" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="precipitation" name={t("weather.legendPrecip")} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="pet" name={t("weather.legendPet")} stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="vpdMax" name={t("weather.legendVpd")} stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
