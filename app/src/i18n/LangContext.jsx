import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { COMMON } from "./common.js";

const KEY = "recybot_lang";
export const LANGS = ["de", "en"];

function initialLang() {
  const param = new URLSearchParams(window.location.search).get("lang");
  if (LANGS.includes(param)) return param;
  try { const s = localStorage.getItem(KEY); if (LANGS.includes(s)) return s; } catch { /* ignore */ }
  return (navigator.language || "de").toLowerCase().startsWith("de") ? "de" : "en";
}

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  const setLang = useCallback(l => { if (LANGS.includes(l)) setLangState(l); }, []);
  const value = useMemo(() => {
    const locale = lang === "de" ? "de-DE" : "en-GB";
    return {
      lang, setLang, locale,
      c: COMMON[lang],
      /** Wählt den Text der aktuellen Sprache aus {de, en}. */
      pick: obj => (obj ? obj[lang] ?? obj.de : obj),
      num: (v, digits = 0) => (v === null || v === undefined || Number.isNaN(v) ? "–"
        : Number(v).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }))
    };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang muss innerhalb von <LangProvider> verwendet werden");
  return ctx;
}

/** Texte eines Moduls in der aktuellen Sprache: const t = useText(TEXT) */
export function useText(dict) {
  const { lang } = useLang();
  return dict[lang] || dict.de;
}
