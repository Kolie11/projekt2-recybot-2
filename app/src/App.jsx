import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Hub from "./views/Hub.jsx";
import AssistantDock from "./components/Assistant.jsx";
import { TutorProvider } from "./ai/TutorContext.jsx";
// Module werden erst geladen, wenn man sie öffnet (schnellerer Start, v. a. im Schulnetz).
const LabelLab = lazy(() => import("./views/LabelLab.jsx"));
const LineController = lazy(() => import("./views/LineController.jsx"));
const LifecycleTycoon = lazy(() => import("./views/LifecycleTycoon.jsx"));
const RepairLab = lazy(() => import("./views/RepairLab.jsx"));
const ReverseLogistics = lazy(() => import("./views/ReverseLogistics.jsx"));
const PolicySimulator = lazy(() => import("./views/PolicySimulator.jsx"));
const DataSprint = lazy(() => import("./views/DataSprint.jsx"));
const GreenAILab = lazy(() => import("./views/GreenAILab.jsx"));
const Capstone = lazy(() => import("./views/Capstone.jsx"));
const Teacher = lazy(() => import("./views/Teacher.jsx"));
const Glossary = lazy(() => import("./views/Glossary.jsx"));
const KnowledgeTest = lazy(() => import("./views/KnowledgeTest.jsx"));
const Report = lazy(() => import("./views/Report.jsx"));
const SystemCheck = lazy(() => import("./views/SystemCheck.jsx"));
import { useTmModel } from "./hooks/useTmModel.js";
import { findPetIndex } from "./ml/models.js";
import { loadProgress, loadResults, loadSettings, loadStudy, saveProgress, saveResults, saveSettings, saveStudy } from "./lib/settings.js";
import { MODULES } from "./i18n/common.js";
import { useLang } from "./i18n/LangContext.jsx";

const VIEWS = ["hub", "lehrkraft", "glossar", "vortest", "nachtest", "bericht", "check", ...MODULES.map(m => m.view)];
const readHash = () => {
  const h = window.location.hash.replace(/^#\/?/, "");
  return VIEWS.includes(h) ? h : "hub";
};

export default function App() {
  const { c, pick } = useLang();
  const [view, setView] = useState(readHash);
  const [settings, setSettings] = useState(loadSettings);
  const [progress, setProgress] = useState(loadProgress);
  const [results, setResults] = useState(loadResults);
  const [study, setStudy] = useState(loadStudy);
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    const onHash = () => { setView(readHash()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const mod = MODULES.find(m => m.view === view);
  useEffect(() => {
    const named = { glossar: c.glossary, lehrkraft: c.teacher, vortest: c.preTest, nachtest: c.postTest, bericht: c.report, check: c.check };
    document.title = mod ? `${pick(mod.title)} · RecyBot 2.0` : named[view] ? `${named[view]} · RecyBot 2.0` : "RecyBot 2.0";
  }, [mod, view, pick, c]);

  const needsModel = view === "line" || view === "lehrkraft";
  const tm = useTmModel(settings.modelUrl, needsModel);
  const labels = tm.model?.labels || [];
  const petIndex = useMemo(() => findPetIndex(labels, settings.petLabel), [labels, settings.petLabel]);

  const updateSettings = useCallback(patch => {
    setSettings(prev => { const next = { ...prev, ...patch }; saveSettings(next); return next; });
  }, []);

  /** Ergebnis eines Moduls speichern (Hub-Häkchen und Capstone). */
  const report = useCallback((key, data, done = true) => {
    setResults(prev => { const next = { ...prev, [key]: { ...prev[key], ...data, at: Date.now() } }; saveResults(next); return next; });
    if (done) setProgress(prev => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: true }; saveProgress(next); return next;
    });
  }, []);
  const reporters = useMemo(() => Object.fromEntries(MODULES.map(m => [m.view, (d, done) => report(m.view, d, done)])), [report]);

  const updateStudy = useCallback(patch => {
    setStudy(prev => { const next = { ...prev, ...patch }; saveStudy(next); return next; });
  }, []);

  const resetAll = () => {
    setProgress({}); saveProgress({}); setResults({}); saveResults({}); setLineItems([]);
    setStudy({}); saveStudy({});
  };

  let page;
  switch (view) {
    case "label": page = <LabelLab report={reporters.label} />; break;
    case "line": page = <LineController tm={tm} labels={labels} petIndex={petIndex} items={lineItems} setItems={setLineItems} report={reporters.line} />; break;
    case "tycoon": page = <LifecycleTycoon report={reporters.tycoon} saved={results.tycoon} />; break;
    case "repair": page = <RepairLab report={reporters.repair} />; break;
    case "routes": page = <ReverseLogistics report={reporters.routes} />; break;
    case "policy": page = <PolicySimulator report={reporters.policy} />; break;
    case "sprint": page = <DataSprint report={reporters.sprint} />; break;
    case "green": page = <GreenAILab report={reporters.green} />; break;
    case "capstone": page = <Capstone results={results} report={reporters.capstone} />; break;
    case "lehrkraft": page = <Teacher settings={settings} updateSettings={updateSettings} tm={tm} labels={labels} petIndex={petIndex} resetProgress={resetAll} />; break;
    case "glossar": page = <Glossary />; break;
    case "check": page = <SystemCheck />; break;
    case "vortest": page = <KnowledgeTest key="pre" mode="pre" study={study} updateStudy={updateStudy} />; break;
    case "nachtest": page = <KnowledgeTest key="post" mode="post" study={study} updateStudy={updateStudy} progress={progress} />; break;
    case "bericht": page = <Report study={study} updateStudy={updateStudy} results={results} progress={progress} />; break;
    default: page = <Hub progress={progress} study={study} results={results} />;
  }

  return (
    <TutorProvider>
      <a className="skip" href="#main">Skip</a>
      <Header view={view} mod={mod} progress={progress} />
      <main className="page" id="main">
        <ErrorBoundary resetKey={view} labels={{ title: c.errorTitle, text: c.errorText, retry: c.retry }}>
          <Suspense fallback={<div className="status info mt-lg" role="status"><span className="spinner" aria-hidden="true" /> …</div>}>{page}</Suspense>
        </ErrorBoundary>
        {mod && <NextNav mod={mod} />}
      </main>
      <footer className="foot">
        <span>{c.footer}</span>
        <span className="foot-links"><a href="#bericht">{c.report}</a> · <a href="#glossar">{c.glossary}</a> · <a href="#check">{c.check}</a> · <a href="#lehrkraft">{c.teacher}</a></span>
      </footer>
      {mod && <AssistantDock module={mod.view} />}
    </TutorProvider>
  );
}

function NextNav({ mod }) {
  const { c, pick } = useLang();
  const prev = MODULES.find(m => m.n === mod.n - 1);
  const next = MODULES.find(m => m.n === mod.n + 1);
  return (
    <nav className="nextnav" aria-label="Module">
      {prev ? <a className="btn secondary" href={"#" + prev.view}>{c.prev(prev.n, pick(prev.title))}</a> : <span />}
      {next ? <a className="btn" href={"#" + next.view}>{c.next(next.n, pick(next.title))}</a>
            : <a className="btn" href="#hub">{c.toHub}</a>}
    </nav>
  );
}
