import React from "react";
import { MapPin, Trash2, CheckCircle2 } from "lucide-react";

export function SavedFieldsBar({ savedFields, activeFieldId, onSelectField, onDeleteField }) {
  if (!savedFields || savedFields.length === 0) return null;

  return (
    <div className="glass-card" style={{ margin: "0 1rem 1rem 1rem", padding: "0.75rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", overflowX: "auto" }}>
        
        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Saved Fields ({savedFields.length}):
        </span>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "nowrap" }}>
          {savedFields.map(f => {
            const isActive = activeFieldId === f.id;
            return (
              <div
                key={f.id}
                onClick={() => onSelectField(f)}
                style={{
                  background: isActive ? "rgba(16, 185, 129, 0.25)" : "rgba(255, 255, 255, 0.05)",
                  border: isActive ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  padding: "0.4rem 0.8rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease"
                }}
              >
                <MapPin size={14} color={isActive ? "#10b981" : "#94a3b8"} />
                <span style={{ fontSize: "0.85rem", fontWeight: isActive ? "700" : "500", color: isActive ? "#ffffff" : "var(--text-muted)" }}>
                  {f.name} ({f.crop_id.toUpperCase()})
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteField(f.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "2px"
                  }}
                  title="Delete Saved Field"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
