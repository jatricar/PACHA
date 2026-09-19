import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Leaf, PlusCircle, RefreshCw, Globe, LogOut, ShieldCheck, MessageCircle } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { useAuth } from "../auth/AuthContext";
import { getWhatsAppLink } from "../lib/contact";

export function Navbar({ onOpenNewFieldModal, onRefresh, isLoading, isAdmin, onOpenAdmin }) {
  const { t, lang, setLang, supportedLanguages } = useLanguage();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const avatarBtnRef = useRef(null);
  const menuRef = useRef(null);

  const toggleMenu = () => {
    if (!menuOpen && avatarBtnRef.current) {
      const rect = avatarBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setMenuOpen(prev => !prev);
  };

  // Close on outside click - the menu is portaled to <body>, so it's no
  // longer a DOM descendant of the avatar button; check both refs.
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (
        avatarBtnRef.current && !avatarBtnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <header className="glass-card" style={{ margin: "1rem", padding: "0.85rem 1.5rem", borderRadius: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>

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
              PACHA <span style={{ color: "#10b981", fontWeight: "300" }}>AI</span>
            </h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, maxWidth: "420px" }}>
              {t("navbar.subtitle")}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

          {/* Language Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", padding: "0.2rem" }}>
            <Globe size={14} color="var(--text-muted)" style={{ marginLeft: "0.3rem" }} />
            {supportedLanguages.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                title={l.name}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  background: lang === l.code ? "var(--primary-emerald)" : "transparent",
                  color: lang === l.code ? "#ffffff" : "var(--text-muted)"
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            className="btn-outline"
            disabled={isLoading}
            title={t("navbar.recalculateTitle")}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            <span>{t("navbar.recalculate")}</span>
          </button>

          <a
            href={getWhatsAppLink(lang)}
            target="_blank"
            rel="noopener noreferrer"
            title={t("navbar.whatsappTitle")}
            className="btn-outline"
            style={{ color: "#25D366", borderColor: "rgba(37,211,102,0.35)" }}
          >
            <MessageCircle size={16} />
          </a>

          <button onClick={onOpenNewFieldModal} className="btn-emerald">
            <PlusCircle size={18} />
            <span>{t("navbar.newField")}</span>
          </button>

          {/* User Avatar Button */}
          {user && (
            <button
              ref={avatarBtnRef}
              onClick={toggleMenu}
              style={{
                border: "none",
                cursor: "pointer",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "9999px",
                padding: "2px",
                display: "flex",
                alignItems: "center"
              }}
              title={user.email}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} style={{ width: "32px", height: "32px", borderRadius: "9999px" }} />
              ) : (
                <div style={{
                  width: "32px", height: "32px", borderRadius: "9999px",
                  background: "var(--primary-emerald)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.85rem", fontWeight: "700"
                }}>
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          )}
        </div>

      </div>

      {/* User dropdown menu - rendered via Portal directly under <body>, so it
          always paints above every other card on the page regardless of each
          card's own stacking context. */}
      {user && menuOpen && createPortal(
        <div
          ref={menuRef}
          className="glass-card"
          style={{
            position: "fixed",
            top: menuPos.top,
            right: menuPos.right,
            minWidth: "220px",
            padding: "0.5rem",
            zIndex: 9999
          }}
        >
          <div style={{ padding: "0.5rem 0.6rem", fontSize: "0.8rem", color: "var(--text-muted)", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "0.3rem" }}>
            {user.email}
          </div>
          {isAdmin && (
            <button
              onClick={() => { setMenuOpen(false); onOpenAdmin(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "0.5rem",
                background: "none", border: "none", color: "#e2e8f0", cursor: "pointer",
                padding: "0.5rem 0.6rem", borderRadius: "6px", fontSize: "0.85rem"
              }}
            >
              <ShieldCheck size={15} />
              <span>{t("auth.adminPanel")}</span>
            </button>
          )}
          <button
            onClick={() => { setMenuOpen(false); signOut(); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "0.5rem",
              background: "none", border: "none", color: "#f87171", cursor: "pointer",
              padding: "0.5rem 0.6rem", borderRadius: "6px", fontSize: "0.85rem"
            }}
          >
            <LogOut size={15} />
            <span>{t("auth.signOut")}</span>
          </button>
        </div>,
        document.body
      )}
    </header>
  );
}
