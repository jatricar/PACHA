import React, { useState } from "react";
import { Leaf, LogIn, MapPin, Sprout, Sparkles, Snowflake, FlaskConical, Globe } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Public landing page shown before sign-in. Deliberately stays at the
 * "what you get" level - crop stage awareness, climate risk, suggested
 * action - without naming specific weather providers, data sources, or the
 * underlying calculation method (GDD/BBCH etc.), since those are the
 * product's technical internals, not part of the sales pitch.
 */
export function LoginScreen() {
  const { signInWithGoogle, authError } = useAuth();
  const { t, lang, setLang, supportedLanguages } = useLanguage();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    await signInWithGoogle();
    // If this succeeds, the browser redirects away to Google - no need to
    // reset signingIn here. If it fails, authError will be set and we can stop.
    setSigningIn(false);
  };

  const steps = [
    { Icon: MapPin, title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { Icon: Sprout, title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { Icon: Sparkles, title: t("landing.step3Title"), desc: t("landing.step3Desc") }
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "1.5rem" }}>

      {/* Top bar: logo + language switcher - there's no Navbar yet at this
          point (that only renders once logged in), so this is the only
          place a visitor can switch language before signing in. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "900px", margin: "0 auto 2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
            padding: "0.5rem",
            borderRadius: "10px",
            display: "inline-flex"
          }}>
            <Leaf size={20} color="#ffffff" />
          </div>
          <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>
            PACHA <span style={{ color: "#10b981", fontWeight: "300" }}>AI</span>
          </span>
        </div>

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
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: "700px", margin: "0 auto 3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.1rem", fontWeight: "800", color: "#ffffff", lineHeight: 1.2, margin: "0 0 1rem" }}>
          {t("landing.heroTitle")}
        </h1>
        <p style={{ fontSize: "1.05rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 1rem" }}>
          {t("landing.heroSubtitle")}
        </p>
        <p style={{ fontSize: "0.92rem", color: "var(--text-subtle)", lineHeight: 1.6, margin: "0 0 2rem" }}>
          {t("landing.heroDescription")}
        </p>

        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="btn-emerald"
          style={{ padding: "0.85rem 2rem", fontSize: "1rem" }}
        >
          <LogIn size={18} />
          <span>{signingIn ? t("auth.signingIn") : t("landing.ctaPrimary")}</span>
        </button>

        {authError && (
          <p style={{ color: "#f43f5e", fontSize: "0.8rem", marginTop: "1rem" }}>
            {t("auth.loginError", { error: authError })}
          </p>
        )}
      </div>

      {/* How it works */}
      <div style={{ maxWidth: "900px", margin: "0 auto 3rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", textAlign: "center", marginBottom: "1.5rem" }}>
          {t("landing.howItWorksTitle")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
          {steps.map(({ Icon, title, desc }, i) => (
            <div key={i} className="glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 0.85rem"
              }}>
                <Icon size={20} color="#10b981" />
              </div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", margin: "0 0 0.4rem" }}>
                {i + 1}. {title}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Illustrative example - static mockup, not live data, so it never
          depends on (or exposes) the real analysis pipeline. */}
      <div style={{ maxWidth: "560px", margin: "0 auto 3rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", textAlign: "center", marginBottom: "1.25rem" }}>
          {t("landing.exampleTitle")}
        </h2>

        <div className="glass-card" style={{ padding: "1.5rem", position: "relative" }}>
          <span style={{
            position: "absolute", top: "1rem", right: "1rem",
            fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em",
            color: "var(--text-subtle)", background: "rgba(255,255,255,0.06)",
            padding: "0.2rem 0.5rem", borderRadius: "6px"
          }}>
            {t("landing.exampleBadge")}
          </span>

          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", margin: "0 0 0.2rem" }}>
            {t("landing.exampleCrop")}
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 0.15rem" }}>
            {t("landing.exampleStage")}
          </p>
          <p style={{ fontSize: "0.82rem", color: "#06b6d4", fontWeight: "600", margin: "0 0 1.1rem" }}>
            {t("landing.exampleHarvest")}
          </p>

          <div style={{
            background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "10px", padding: "0.85rem", marginBottom: "0.75rem",
            display: "flex", gap: "0.6rem", alignItems: "flex-start"
          }}>
            <Snowflake size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff" }}>{t("landing.exampleAlertTitle")}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>{t("landing.exampleAlertDesc")}</div>
            </div>
          </div>

          <div style={{
            background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: "10px", padding: "0.85rem",
            display: "flex", gap: "0.6rem", alignItems: "flex-start"
          }}>
            <FlaskConical size={18} color="#10b981" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff" }}>{t("landing.exampleRecTitle")}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>{t("landing.exampleRecDesc")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", paddingBottom: "2rem" }}>
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          {t("landing.footerCta")}
        </p>
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="btn-emerald"
          style={{ padding: "0.75rem 1.75rem" }}
        >
          <LogIn size={18} />
          <span>{signingIn ? t("auth.signingIn") : t("auth.signInWithGoogle")}</span>
        </button>
      </div>

    </div>
  );
}
