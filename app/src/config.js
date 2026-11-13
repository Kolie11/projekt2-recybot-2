// ============================================================
// RecyBot 2.0 – Standard-Einstellungen
// Alles hier kann später auch in der App unter „Lehrkraft“
// oder per Link (?model=...&pet=...) überschrieben werden.
// ============================================================
export const CONFIG = {
  // Teachable-Machine-Link, z. B. "https://teachablemachine.withgoogle.com/models/AbCd123/"
  MODEL_URL: "",
  // Name der PET-Klasse im Modell (leer = automatisch erkennen)
  PET_LABEL: "PET",
  // Links zu den Formularen (Google Forms / Microsoft Forms)
  VORTEST_URL: "",
  NACHTEST_URL: "",
  // KI-Assistent (Module 2, 4, 6, 7). Ohne Server-Schlüssel gibt er berechnete Offline-Tipps.
  ASSISTANT_ENABLED: true,
  ASSISTANT_URL: "/api/assistant"
};
