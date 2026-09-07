import React, { useState } from "react";
import { Leaf, LogIn } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

export function LoginScreen() {
  const { signInWithGoogle, authError } = useAuth();
  const { t } = useLanguage();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    await signInWithGoogle();
    // If this succeeds, the browser redirects away to Google - no need to
    // reset signingIn here. If it fails, authError will be set and we can stop.
    setSigningIn(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem"
    }}>
      <div className="glass-card" style={{ width: "100%", maxWidth: "380px", padding: "2.5rem 2rem", textAlign: "center" }}>

        <div style={{
          background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
          padding: "1rem",
          borderRadius: "16px",
          display: "inline-flex",
          boxShadow: "0 0 24px rgba(16, 185, 129, 0.4)",
          marginBottom: "1.25rem"
        }}>
          <Leaf size={32} color="#ffffff" />
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#ffffff", margin: "0 0 0.3rem 0" }}>
          PACHA <span style={{ color: "#10b981", fontWeight: "300" }}>AI</span>
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "2rem" }}>
          {t("auth.appTagline")}
        </p>

        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="btn-emerald"
          style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
        >
          <LogIn size={18} />
          <span>{signingIn ? t("auth.signingIn") : t("auth.signInWithGoogle")}</span>
        </button>

        {authError && (
          <p style={{ color: "#f43f5e", fontSize: "0.8rem", marginTop: "1rem" }}>
            {t("auth.loginError", { error: authError })}
          </p>
        )}

      </div>
    </div>
  );
}
