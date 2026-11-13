import { MODULES } from "../i18n/common.js";
import { LANGS, useLang } from "../i18n/LangContext.jsx";
import { Logo } from "./icons.jsx";

export default function Header({ view, mod, progress = {} }) {
  const { c, lang, setLang, pick } = useLang();
  return (
    <header className="hdr">
      <div className="hdr-in">
        <a className="brand" href="#hub">
          <Logo size={34} />
          <b>RecyBot 2.0</b>
          <span>{mod ? c.moduleOf(mod.n, pick(mod.tag)) : c.appTag}</span>
        </a>
        <div className="hdr-right">
          <ol className="dots" aria-label={c.progress}>
            {MODULES.map(m => (
              <li key={m.n}>
                <a href={"#" + m.view} title={`${m.n}. ${pick(m.title)}${progress[m.view] ? ` (${c.done})` : ""}`}
                  aria-current={m.view === view ? "page" : undefined}
                  className={"dot" + (progress[m.view] ? " done" : "") + (m.view === view ? " cur" : "")}>
                  <span className="sr">{m.n}. {pick(m.title)}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="lang-switch" role="group" aria-label={c.lang}>
            {LANGS.map(l => (
              <button key={l} className={l === lang ? "on" : ""} aria-pressed={l === lang} onClick={() => setLang(l)} lang={l}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {view !== "hub" ? <a className="btn ghost" href="#hub">{c.overview}</a> : <a className="btn ghost" href="#bericht">{c.report}</a>}
        </div>
      </div>
    </header>
  );
}
