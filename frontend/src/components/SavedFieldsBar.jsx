import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapPin, Trash2, ChevronDown } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

export function SavedFieldsBar({ savedFields, activeFieldId, onSelectField, onDeleteField, usage }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // IMPORTANT: every hook must run on every render, in the same order - so
  // this effect has to be declared BEFORE any early return below. Having it
  // after the `if (!savedFields...) return null;` check used to make React
  // call a different number of hooks depending on whether fields were loaded
  // yet, which is an actual Rules-of-Hooks violation and crashed the app.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!savedFields || savedFields.length === 0) return null;

  const activeField = savedFields.find(f => f.id === activeFieldId) || savedFields[0];
  const usageNearLimit = usage && usage.used >= usage.limit;

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
    setOpen(prev => !prev);
  };

  return (
    <div className="glass-card" style={{ margin: "0 1rem 1rem 1rem", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>

      <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {t("savedFields.label", { n: savedFields.length })}
      </span>

      {/* Compact dropdown trigger - ~1/4 of the header's width, never a full-width row */}
      <button
        ref={btnRef}
        onClick={toggleOpen}
        style={{
          width: "25%", minWidth: "220px", maxWidth: "340px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
          background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981",
          borderRadius: "10px", padding: "0.5rem 0.8rem", cursor: "pointer", color: "#ffffff"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <MapPin size={14} color="#10b981" />
          <span style={{ fontSize: "0.85rem", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeField.name} ({t(`crops.${activeField.crop_id}`)})
          </span>
        </span>
        <ChevronDown size={16} color="#10b981" style={{ flexShrink: 0 }} />
      </button>

      {usage && (
        <span style={{
          marginLeft: "auto",
          fontSize: "0.75rem",
          fontWeight: "600",
          whiteSpace: "nowrap",
          color: usageNearLimit ? "#f59e0b" : "var(--text-muted)"
        }}>
          {t("savedFields.usage", { used: usage.used, limit: usage.limit, tier: usage.tier })}
        </span>
      )}

      {/* Dropdown list - rendered via Portal directly under <body>, same
          technique used for the user menu, so it can never get trapped
          behind another card's own stacking context. */}
      {open && createPortal(
        <div
          ref={menuRef}
          className="glass-card"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: Math.max(pos.width, 260),
            maxHeight: "50vh",
            overflowY: "auto",
            padding: "0.4rem",
            zIndex: 9999
          }}
        >
          {savedFields.map(f => {
            const isActive = f.id === activeFieldId;
            return (
              <div
                key={f.id}
                onClick={() => { onSelectField(f); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.5rem 0.6rem", borderRadius: "8px", cursor: "pointer",
                  background: isActive ? "rgba(16,185,129,0.15)" : "transparent"
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                  <MapPin size={13} color={isActive ? "#10b981" : "#94a3b8"} />
                  <span style={{
                    fontSize: "0.85rem",
                    color: isActive ? "#ffffff" : "var(--text-muted)",
                    fontWeight: isActive ? "700" : "500",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                  }}>
                    {f.name} ({t(`crops.${f.crop_id}`)})
                  </span>
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteField(f.id); }}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "2px", flexShrink: 0 }}
                  title={t("savedFields.deleteTitle")}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}

    </div>
  );
}
