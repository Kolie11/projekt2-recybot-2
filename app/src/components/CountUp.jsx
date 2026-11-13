import { useRef } from "react";
import { gsap, useGSAP, MOTION_OK } from "../lib/motion.js";
import { useLang } from "../i18n/LangContext.jsx";

/**
 * Zahl, die beim ersten Sichtbarwerden von 0 hochzählt.
 * Ohne JavaScript-Animation (oder mit reduzierter Bewegung) steht sofort der Endwert da.
 * GSAP schreibt direkt in den Textknoten, React rendert dabei nicht neu.
 */
export default function CountUp({ value, digits = 0, prefix = "", suffix = "", signed = false, className }) {
  const ref = useRef(null);
  const { locale } = useLang();
  const fmt = v => {
    const s = Number(v).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return prefix + (signed && v > 0 ? "+" : "") + s + suffix;
  };
  const ok = typeof value === "number" && isFinite(value);

  useGSAP(() => {
    if (!ok || value === 0) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const counter = { v: 0 };
      gsap.to(counter, {
        v: value, duration: 0.9, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 92%", once: true },
        onUpdate: () => { if (ref.current) ref.current.textContent = fmt(counter.v); },
        onComplete: () => { if (ref.current) ref.current.textContent = fmt(value); }
      });
      return () => { if (ref.current) ref.current.textContent = fmt(value); };
    });
  }, { dependencies: [value, locale], scope: ref });

  return <span ref={ref} className={"num-tab " + (className || "")}>{ok ? fmt(value) : "–"}</span>;
}
