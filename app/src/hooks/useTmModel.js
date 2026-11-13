import { useCallback, useEffect, useRef, useState } from "react";
import { loadMobileNetClassifier, loadTmModel } from "../ml/models.js";

/**
 * Lädt die Bilderkennung für Modul 2, sobald `active` true ist:
 * mit Link → eigenes Teachable-Machine-Modell, sonst vortrainiertes MobileNet.
 */
export function useTmModel(url, active) {
  const [state, setState] = useState({ status: "idle", model: null, error: "" });
  const loadedFor = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const key = url || "__mobilenet__";

  useEffect(() => {
    if (!active || loadedFor.current === key) return;
    let cancelled = false;
    loadedFor.current = key;
    setState({ status: "loading", model: null, error: "" });
    (url ? loadTmModel(url) : loadMobileNetClassifier())
      .then(model => { if (!cancelled) { loadedFor.current = key; setState({ status: "ready", model, error: "" }); } })
      .catch(e => {
        console.error(e);
        loadedFor.current = null;
        if (!cancelled) setState({ status: "error", model: null, error: e.message || String(e) });
      });
    return () => {
      cancelled = true;
      // Abgebrochen, bevor das Laden fertig war (z. B. React StrictMode): beim nächsten Durchlauf neu laden
      if (loadedFor.current === key) loadedFor.current = null;
    };
  }, [key, url, active, attempt]);

  const retry = useCallback(() => { loadedFor.current = null; setAttempt(a => a + 1); }, []);
  return { ...state, retry };
}
