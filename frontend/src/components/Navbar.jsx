import React from "react";
import { Leaf, PlusCircle, MapPin, RefreshCw } from "lucide-react";

export function Navbar({ onOpenNewFieldModal, onRefresh, isLoading }) {
  return (
    <header className="glass-card" style={{ margin: "1rem", padding: "0.85rem 1.5rem", borderRadius: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
            padding: "0.6rem",
            borderRadius: "12px",
            display: "flex",
            boxShadow: "0 0 16px rgba(16, 185, 129, 0.4)"
          }}>
            <Leaf size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: "700", letterSpacing: "-0.02em", color: "#ffffff", margin: 0 }}>
              CROPSTRESS <span style={{ color: "#10b981", fontWeight: "300" }}>AI</span>
            </h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
              Top 10 Global Crops Abiotic Stress & Anti-Stress Product Engine
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button 
            onClick={onRefresh} 
            className="btn-outline" 
            disabled={isLoading}
            title="Recalculate 3-Source Ensemble & Phenology"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            <span>Recalculate</span>
          </button>

          <button onClick={onOpenNewFieldModal} className="btn-emerald">
            <PlusCircle size={18} />
            <span>New Crop Field</span>
          </button>
        </div>

      </div>
    </header>
  );
}
