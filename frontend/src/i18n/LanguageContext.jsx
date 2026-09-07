import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, supportedLanguages } from "./translations";

const LanguageContext = createContext(null);

const STORAGE_KEY = "pacha_lang";

function detectInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch (e) {
    // localStorage unavailable (private browsing, etc.) - fall through
  }
  const browserLang = (navigator.language || "es").slice(0, 2).toLowerCase();
  return translations[browserLang] ? browserLang : "es";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // ignore write failures
    }
  }, [lang]);

  const setLang = (code) => {
    if (translations[code]) setLangState(code);
  };

  const t = (key, vars) => {
    const parts = key.split(".");
    let node = translations[lang];
    for (const p of parts) {
      node = node ? node[p] : undefined;
    }
    if (node === undefined) {
      // Fallback chain: current lang missing key -> Spanish -> the raw key
      node = parts.reduce((acc, p) => (acc ? acc[p] : undefined), translations.es);
    }
    if (typeof node !== "string") return key;
    if (vars) {
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.split(`{${k}}`).join(v),
        node
      );
    }
    return node;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, supportedLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage() must be used within a <LanguageProvider>");
  }
  return ctx;
}
