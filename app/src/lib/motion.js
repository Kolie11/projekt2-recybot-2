// Bewegung mit GSAP: nur dort, wo sie etwas zeigt (Einstieg, Aufbau der Stadt, Zahlen).
// Wer im System „Bewegung reduzieren“ eingestellt hat, sieht sofort den Endzustand.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const EASE = "power3.out";

// Positionen neu berechnen, sobald die Schriften geladen sind (sonst stimmen die Startpunkte nicht).
if (typeof document !== "undefined" && document.fonts?.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

export { gsap, ScrollTrigger, useGSAP };
