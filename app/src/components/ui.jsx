import { useLang } from "../i18n/LangContext.jsx";

export function Eyebrow({ children, color }) {
  return <div className="eyebrow" style={color ? { color } : undefined}>{children}</div>;
}

export function Merksatz({ children }) {
  const { c } = useLang();
  return (
    <div className="merk">
      <div className="eyebrow">{c.takeaway}</div>
      {children}
    </div>
  );
}

export function Meter({ label, value, color, hint, suffix = " %" }) {
  return (
    <div className="metric">
      <div className="lbl"><span>{label}</span><span>{value === null || value === undefined ? "–" : value + suffix}</span></div>
      <div className="track big" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? 0}>
        <div className="fill" style={{ width: Math.max(0, Math.min(100, value || 0)) + "%", background: color }} />
      </div>
      {hint && <div className="muted">{hint}</div>}
    </div>
  );
}

export function ModuleIntro({ eyebrow, title, lead, children }) {
  return (
    <div className="intro">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="h-page">{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {children && <div className="intro-side">{children}</div>}
    </div>
  );
}

/** Rückmeldung mit Begründung. tone: ok | warn | info */
export function Why({ tone = "info", title, children }) {
  return (
    <div className={"why " + tone} aria-live="polite">
      <b>{title}</b>
      {children && <div>{children}</div>}
    </div>
  );
}

export function Kpi({ label, value }) {
  return (
    <div className="kpi">
      <div className="kpi-v">{value}</div>
      <div className="kpi-l">{label}</div>
    </div>
  );
}

/**
 * „Hinter den Kulissen“: erklärt das Konzept hinter dem Modul.
 * sections: [{ h, p }] – p darf Text oder JSX sein.
 */
export function Concept({ sections, terms }) {
  const { c } = useLang();
  return (
    <details className="concept">
      <summary>
        <span className="concept-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.3h6c0-1.1.4-1.8 1-2.3A7 7 0 0 0 12 2z" /></svg>
        </span>
        <span><b>{c.behind}</b><small>{c.behindHint}</small></span>
      </summary>
      <div className="concept-body">
        {sections.map((s, i) => (
          <section key={i}>
            <h3>{s.h}</h3>
            {typeof s.p === "string" ? <p>{s.p}</p> : s.p}
          </section>
        ))}
        {terms && (
          <div className="terms">
            {terms.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
          </div>
        )}
      </div>
    </details>
  );
}

/** Ladeanzeige für KI-Modelle. */
export function AiStatus({ status, error, fallback }) {
  const { c } = useLang();
  if (status === "ready" && !fallback) return null;
  if (status === "loading") return <div className="status info" role="status"><span className="spinner" aria-hidden="true" /> {c.aiLoading}</div>;
  if (fallback) return <div className="status info" role="status">{c.aiFallback}</div>;
  if (status === "error") return <div className="status warn" role="alert">{error}</div>;
  return null;
}
