import { useEffect, useMemo, useRef, useState } from "react";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { ModuleIntro, Why } from "../components/ui.jsx";
import { SURVEY_ITEMS, TEST_ITEMS, scoreTest } from "../logic/assessment.js";
import { CONFIG } from "../config.js";

const TEXT = {
  de: {
    pre: { eyebrow: "Schritt 1 · Vortest", title: "Was weißt du schon?",
      lead: "Zwölf kurze Fragen zu KI und Kreislaufwirtschaft. Es gibt keine Noten. Wir wollen nur sehen, was du nach den Modulen dazugelernt hast. Wenn du etwas nicht weißt, wähle einfach „Weiß ich nicht“." },
    post: { eyebrow: "Schritt 3 · Nachtest", title: "Was weißt du jetzt?",
      lead: "Dieselben zwölf Fragen wie am Anfang, danach fünf kurze Fragen dazu, wie dir RecyBot gefallen hat. Diesmal siehst du am Ende, was richtig war." },
    codeH: "Dein Codename",
    codeHint: "Damit Vor- und Nachtest zusammengehören, ohne dass dein Name gespeichert wird. Vorschlag: die ersten zwei Buchstaben vom Vornamen deiner Mutter und dein Geburtstag (nur der Tag), zum Beispiel „MA14“. Merk ihn dir für den Nachtest.",
    codePh: "z. B. MA14", start: "Test starten", codeShort: "Bitte mindestens zwei Zeichen eingeben.",
    q: (a, b) => `Frage ${a} von ${b}`, dk: "Weiß ich nicht", back: "Zurück", next: "Weiter", finish: "Abgeben",
    missingQ: n => `Noch nicht beantwortet: Frage ${n.join(", ")}. Wähle bei jeder Frage eine Antwort oder „Weiß ich nicht“.`, goTo: n => `Zu Frage ${n}`,
    pick: "Bitte eine Antwort wählen.",
    open: n => (n ? `${n} Frage${n > 1 ? "n" : ""} noch offen` : "Alle Fragen beantwortet"),
    preDone: "Danke! Dein Vortest ist gespeichert.",
    preDoneText: "Die Antworten bekommst du erst nach dem Nachtest zu sehen. So kannst du am Ende vergleichen, was du dazugelernt hast.",
    toModule1: "Los geht's mit Modul 1", already: d => `Vortest erledigt am ${d}.`,
    alreadyText: "Ein zweiter Durchgang würde den Vergleich verfälschen. Falls etwas schiefgelaufen ist, kann die Lehrkraft den Stand zurücksetzen.",
    notYet: n => `Du hast ${n} von 9 Modulen gespielt. Am meisten bringt der Nachtest, wenn du vorher alle Module gespielt hast.`,
    noPre: "Du hast keinen Vortest gemacht. Der Nachtest funktioniert trotzdem, nur der Vorher-nachher-Vergleich fehlt.",
    surveyH: "Wie war RecyBot für dich?", likert: ["stimmt gar nicht", "stimmt eher nicht", "teils, teils", "stimmt eher", "stimmt völlig"],
    commentL: "Was war für dich am interessantesten? (freiwillig)", sendSurvey: "Fragebogen abschicken", surveyMissing: "Bitte alle fünf Aussagen bewerten.",
    resultH: "Dein Ergebnis", before: "Vortest", after: "Nachtest", ai: "KI", ce: "Kreislaufwirtschaft",
    gain: d => (d > 0 ? `+${d} Prozentpunkte gegenüber dem Vortest` : d === 0 ? "Gleich wie im Vortest" : `${d} Prozentpunkte gegenüber dem Vortest`),
    review: "Die Fragen im Überblick", yours: "Deine Antwort", right: "Richtig", none: "keine Angabe",
    toReport: "Zum Lernbericht", external: "Zum Fragebogen der Lehrkraft"
  },
  en: {
    pre: { eyebrow: "Step 1 · Pre-test", title: "What do you already know?",
      lead: "Twelve short questions on AI and the circular economy. There are no grades. We just want to see what you learn through the modules. If you don't know something, simply choose “I don't know”." },
    post: { eyebrow: "Step 3 · Post-test", title: "What do you know now?",
      lead: "The same twelve questions as at the start, then five short questions on how you liked RecyBot. This time you'll see the right answers at the end." },
    codeH: "Your code name",
    codeHint: "So that your pre-test and post-test belong together without storing your name. Suggestion: the first two letters of your mother's first name plus the day of your birthday, e.g. “MA14”. Remember it for the post-test.",
    codePh: "e.g. MA14", start: "Start the test", codeShort: "Please enter at least two characters.",
    q: (a, b) => `Question ${a} of ${b}`, dk: "I don't know", back: "Back", next: "Next", finish: "Submit",
    missingQ: n => `Not answered yet: question ${n.join(", ")}. Choose an answer or “I don't know” for each question.`, goTo: n => `Go to question ${n}`,
    pick: "Please choose an answer.",
    open: n => (n ? `${n} question${n > 1 ? "s" : ""} left` : "All questions answered"),
    preDone: "Thanks! Your pre-test is saved.",
    preDoneText: "You'll only see the answers after the post-test. That way you can compare at the end what you have learned.",
    toModule1: "Let's start with module 1", already: d => `Pre-test completed on ${d}.`,
    alreadyText: "A second attempt would distort the comparison. If something went wrong, your teacher can reset the progress.",
    notYet: n => `You have played ${n} of 9 modules. The post-test is most useful after you have played them all.`,
    noPre: "You didn't take the pre-test. The post-test still works, only the before-and-after comparison is missing.",
    surveyH: "How was RecyBot for you?", likert: ["strongly disagree", "disagree", "neutral", "agree", "strongly agree"],
    commentL: "What did you find most interesting? (optional)", sendSurvey: "Send survey", surveyMissing: "Please rate all five statements.",
    resultH: "Your result", before: "Pre-test", after: "Post-test", ai: "AI", ce: "Circular economy",
    gain: d => (d > 0 ? `+${d} percentage points compared with the pre-test` : d === 0 ? "Same as in the pre-test" : `${d} percentage points compared with the pre-test`),
    review: "The questions at a glance", yours: "Your answer", right: "Correct", none: "no answer",
    toReport: "Open learning report", external: "Open your teacher's survey"
  }
};

export default function KnowledgeTest({ mode, study, updateStudy, progress = {} }) {
  const t = useText(TEXT);
  const { lang, locale } = useLang();
  const head = t[mode];
  const saved = study[mode];
  const [code, setCode] = useState(study.code || "");
  const [codeErr, setCodeErr] = useState(false);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState(() => TEST_ITEMS.map(() => undefined));
  const [i, setI] = useState(0);
  const [survey, setSurvey] = useState({});
  const [comment, setComment] = useState("");
  const [surveyErr, setSurveyErr] = useState(false);
  const [missing, setMissing] = useState([]);
  const codeRef = useRef(null), qRef = useRef(null), missRef = useRef(null);

  // Tastatur und Screenreader: Bei jeder neuen Frage springt der Fokus auf die Frage.
  useEffect(() => { if (started) qRef.current?.focus(); }, [i, started]);
  useEffect(() => { if (missing.length) missRef.current?.focus(); }, [missing]);

  const played = Object.keys(progress).length;
  const openCount = answers.filter(a => a === undefined).length;

  const begin = () => {
    const c = code.trim();
    if (c.length < 2) { setCodeErr(true); codeRef.current?.focus(); return; }
    updateStudy({ code: c.toUpperCase() });
    setStarted(true);
  };
  // Kein automatisches Weiterspringen: Die Person entscheidet selbst, wann es weitergeht.
  const choose = v => {
    setAnswers(prev => { const n = [...prev]; n[i] = v; return n; });
    setMissing(m => m.filter(k => k !== i));
  };
  const goto = k => { setMissing([]); setI(k); };
  const submit = () => {
    const open = answers.map((a, k) => (a === undefined ? k : -1)).filter(k => k >= 0);
    if (open.length) { setMissing(open); return; }
    updateStudy({ [mode]: { answers: answers.map(a => (a === undefined ? null : a)), at: Date.now() } });
    setStarted(false);
  };

  // ---------- Bereits abgelegt ----------
  if (saved && mode === "pre") {
    const justNow = Date.now() - saved.at < 60_000;
    return (
      <section className="narrow">
        <ModuleIntro eyebrow={head.eyebrow} title={head.title} />
        <div className="res good mt-lg">
          <div className="eyebrow">{study.code}</div>
          <h2>{justNow ? t.preDone : t.already(new Date(saved.at).toLocaleDateString(locale))}</h2>
          <p>{justNow ? t.preDoneText : t.alreadyText}</p>
          <a className="btn tall" href="#label">{t.toModule1}</a>
        </div>
      </section>
    );
  }
  if (saved && mode === "post") {
    if (!study.survey) return <Survey t={t} survey={survey} setSurvey={setSurvey} comment={comment} setComment={setComment} err={surveyErr}
      onSend={() => {
        if (SURVEY_ITEMS.some(s => !survey[s.id])) { setSurveyErr(true); return; }
        updateStudy({ survey, comment: comment.trim().slice(0, 500) });
      }} />;
    return <PostResult t={t} lang={lang} study={study} />;
  }

  // ---------- Start ----------
  if (!started) {
    return (
      <section className="narrow">
        <ModuleIntro eyebrow={head.eyebrow} title={head.title} lead={head.lead} />
        {mode === "post" && played < 9 && <div className="status info mt-lg">{t.notYet(played)}</div>}
        {mode === "post" && !study.pre && <div className="status info mt">{t.noPre}</div>}
        <div className="card stack mt-lg">
          <label htmlFor="code" className="h-card" style={{ margin: 0 }}>{t.codeH}</label>
          <p id="code-hint" className="muted" style={{ margin: 0 }}>{t.codeHint}</p>
          <input id="code" ref={codeRef} className="input code-input" value={code} maxLength={24} autoComplete="off" spellCheck={false}
            placeholder={t.codePh} onChange={e => { setCode(e.target.value); setCodeErr(false); }}
            onKeyDown={e => { if (e.key === "Enter") begin(); }} aria-invalid={codeErr} aria-describedby={codeErr ? "code-err code-hint" : "code-hint"} />
          {codeErr && <div id="code-err" className="status warn" role="alert">{t.codeShort}</div>}
          <button className="wide" onClick={begin}>{t.start}</button>
        </div>
      </section>
    );
  }

  // ---------- Fragen ----------
  const item = TEST_ITEMS[i], [q, opts] = item[lang];
  return (
    <section className="narrow">
      <ModuleIntro eyebrow={head.eyebrow} title={head.title} />
      <div className="qprogress mt-lg" aria-hidden="true">
        {TEST_ITEMS.map((it, k) => (
          <button key={it.id} tabIndex={-1} className={"qp" + (answers[k] !== undefined ? " done" : "") + (k === i ? " cur" : "")} onClick={() => setI(k)} />
        ))}
      </div>
      <div className="qcard mt">
        <form onSubmit={e => { e.preventDefault(); if (i < TEST_ITEMS.length - 1) goto(i + 1); else submit(); }}>
          <fieldset className="qset">
            <legend className="sr">{t.q(i + 1, TEST_ITEMS.length)}: {q}</legend>
            <div className="row between"><span className="muted strong" aria-hidden="true">{t.q(i + 1, TEST_ITEMS.length)}</span><span className="tag">{item.dim === "ai" ? t.ai : t.ce}</span></div>
            <h2 ref={qRef} tabIndex={-1} className="qtext"><span className="sr">{t.q(i + 1, TEST_ITEMS.length)}: </span>{q}</h2>
            <div className="stack-s">
              {[...opts.map((o, k) => [k, o]), [null, t.dk]].map(([k, o]) => (
                <label key={String(k)} className={"opt quiz-opt" + (k === null ? " dk" : "") + (answers[i] === k ? " on" : "")}>
                  <input type="radio" name={"q" + i} checked={answers[i] === k} onChange={() => choose(k)} />
                  {k !== null && <span className="opt-letter" aria-hidden="true">{String.fromCharCode(65 + k)}</span>}
                  <span>{o}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {missing.length > 0 && (
            <div ref={missRef} tabIndex={-1} className="status warn mt" role="alert">
              {t.missingQ(missing.map(k => k + 1))}
              <div className="row mt-s">{missing.map(k => <button type="button" key={k} className="link" onClick={() => goto(k)}>{t.goTo(k + 1)}</button>)}</div>
            </div>
          )}
          <div className="row between mt-lg">
            <button type="button" className="secondary" onClick={() => goto(i - 1)} disabled={i === 0}>{t.back}</button>
            <span className="muted" aria-live="polite">{t.open(openCount)}</span>
            {i < TEST_ITEMS.length - 1
              ? <button type="submit">{t.next}</button>
              : <button type="submit">{t.finish}</button>}
          </div>
        </form>
      </div>
    </section>
  );
}

function Survey({ t, survey, setSurvey, comment, setComment, err, onSend }) {
  const { lang } = useLang();
  const formRef = useRef(null);
  const missingIds = err ? SURVEY_ITEMS.filter(s => !survey[s.id]).map(s => s.id) : [];
  // Nach einem Fehler: Fokus auf die erste offene Aussage.
  const send = () => {
    const first = SURVEY_ITEMS.find(s => !survey[s.id]);
    onSend();
    if (first) setTimeout(() => formRef.current?.querySelector(`input[name="${first.id}"]`)?.focus(), 0);
  };
  return (
    <section className="narrow">
      <ModuleIntro eyebrow={t.post.eyebrow} title={t.surveyH} />
      <div className="card stack mt-lg" ref={formRef}>
        {SURVEY_ITEMS.map(s => (
          <fieldset key={s.id} className={"likert" + (missingIds.includes(s.id) ? " missing" : "")} aria-describedby={missingIds.includes(s.id) ? s.id + "-err" : undefined}>
            <legend>{s[lang]}</legend>
            {missingIds.includes(s.id) && <p id={s.id + "-err"} className="field-err">{t.pick}</p>}
            <div className="likert-row">
              {t.likert.map((l, k) => (
                <label key={k} className={survey[s.id] === k + 1 ? "on" : ""}>
                  <input type="radio" name={s.id} checked={survey[s.id] === k + 1} onChange={() => setSurvey(v => ({ ...v, [s.id]: k + 1 }))} />
                  <b>{k + 1}</b><span>{l}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <label htmlFor="comment">{t.commentL}</label>
        <textarea id="comment" className="input area" rows={3} maxLength={500} value={comment} onChange={e => setComment(e.target.value)} />
        {err && <div className="status warn" role="alert">{t.surveyMissing}</div>}
        <button className="wide" onClick={send}>{t.sendSurvey}</button>
      </div>
    </section>
  );
}

function PostResult({ t, lang, study }) {
  const pre = useMemo(() => (study.pre ? scoreTest(study.pre.answers) : null), [study.pre]);
  const post = useMemo(() => scoreTest(study.post.answers), [study.post]);
  const bar = (label, s, cls) => (
    <div className="cmp-row">
      <span>{label}</span>
      <div className="track big"><div className={"fill " + cls} style={{ width: s.pct + "%" }} /></div>
      <b>{s.pct} %</b>
    </div>
  );
  const dim = (s, d) => Math.round((s[d] / (d === "ai" ? s.nAi : s.nCe)) * 100);
  return (
    <section className="narrow">
      <ModuleIntro eyebrow={t.post.eyebrow + " · " + study.code} title={t.resultH} />
      <div className="card stack mt-lg">
        {pre && bar(t.before, pre, "pre")}
        {bar(t.after, post, "")}
        {pre && <p className="big-gain">{t.gain(post.pct - pre.pct)}</p>}
        <div className="grid2">
          <div className="soft-box"><b>{t.ai}</b><br />{pre ? `${dim(pre, "ai")} % → ` : ""}{dim(post, "ai")} %</div>
          <div className="soft-box"><b>{t.ce}</b><br />{pre ? `${dim(pre, "ce")} % → ` : ""}{dim(post, "ce")} %</div>
        </div>
        <div className="row">
          <a className="btn tall" href="#bericht">{t.toReport}</a>
          {CONFIG.NACHTEST_URL && <a className="btn secondary tall" href={CONFIG.NACHTEST_URL} target="_blank" rel="noopener noreferrer">{t.external}</a>}
        </div>
      </div>
      <h2 className="phase">{t.review}</h2>
      <div className="stack">
        {TEST_ITEMS.map((it, k) => {
          const [q, opts, expl] = it[lang];
          const mine = study.post.answers[k], ok = mine === it.a;
          return (
            <Why key={it.id} tone={ok ? "ok" : "warn"} title={`${k + 1}. ${q}`}>
              <div className="mt-s">{t.yours}: <b>{mine === null || mine === undefined ? t.none : opts[mine]}</b>{!ok && <> · {t.right}: <b>{opts[it.a]}</b></>}</div>
              <div className="mt-s">{expl}</div>
            </Why>
          );
        })}
      </div>
    </section>
  );
}
