import { useMemo, useState } from "react";
import { Concept, Merksatz, ModuleIntro, Why } from "../components/ui.jsx";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { MODULES } from "../i18n/common.js";
import { computeCity } from "../logic/city.js";
import { rng, shuffle } from "../logic/rng.js";
import CityScene from "../components/CityScene.jsx";
import CountUp from "../components/CountUp.jsx";
import { Tutor } from "../ai/TutorContext.jsx";

const BUILDINGS = [
  { key: "label", span: "" }, { key: "line", span: "span2" }, { key: "repair", span: "" },
  { key: "policy", span: "row2" }, { key: "park", deco: true }, { key: "routes", span: "" }, { key: "green", span: "" },
  { key: "sprint", span: "span2" }, { key: "tycoon", span: "" }
];

const TEXT = {
  de: {
    eyebrow: "Modul 9 · Capstone", title: "Deine Kreislaufstadt",
    lead: "Hier laufen deine Ergebnisse aus den Modulen 1 bis 8 zusammen. Manche Entscheidungen verstärken sich, andere bremsen sich gegenseitig aus. Klick auf ein Gebäude, um zum Modul zurückzugehen.",
    kpi: ["Kreislaufquote", "CO₂ gegenüber heute", "Zufriedenheit"],
    played: n => `${n} von 8 Modulen gespielt.`, open: "Noch offen:", neutral: "Offene Gebäude zählen neutral.",
    map: "Stadtplan", park: "Park",
    b: { label: "Datenlabor", line: "Sortieranlage", repair: "Reparaturcafé", policy: "Rathaus", routes: "Fuhrpark", green: "Rechenzentrum", sprint: "Bürger-Daten-Netz", tycoon: "Designstudio" },
    tile: {
      open: "noch nicht gespielt",
      label: d => `Labels zu ${d.acc} % richtig`, line: d => `Precision ${d.prec} %${d.composite ? " · Problem: Verbundmaterial" : ""}`,
      tycoon: d => `Balance-Score ${d.score}`, repair: d => (d.solved ? `${d.count} von 3 Handys gerettet` : d.broken ? "Gerät zerstört" : `nur ${d.count} von 3 richtig diagnostiziert`),
      routes: d => `Route ${d.overhead} % länger als nötig`, policy: d => `Quote ${d.R} % · Zufriedenheit ${d.S} %`,
      sprint: d => `Abweichung ${d.dev} %${d.diversified ? "" : " · Waldrand fehlt"}`, green: d => `${{ mini: "Mini", medium: "Mittleres", huge: "Riesiges" }[d.model]} Netz`
    },
    legend: ["läuft gut", "mittel", "Problem", "offen"],
    chainTitle: "Kettenreaktion",
    chains: {
      composite: { t: "Warum hat die Sortieranlage Probleme?", s: [["Modul 3", "Du hast Verbundmaterial gewählt."], ["Modul 2", "Die Sortier-KI kann Verbundmaterial schlecht von PET trennen."], ["Folge", "Mehr Fehlalarme, das Rezyklat verliert an Wert."]] },
      labels: { t: "Warum sortiert die KI falsch?", s: c => [["Modul 1", `Deine Labels waren nur zu ${c.acc} % richtig.`], ["Modul 2", "Die Sortier-KI hat aus fehlerhaften Beispielen gelernt."], ["Folge", "Derselbe Fehler wiederholt sich bei jeder Verpackung."]] },
      bias: { t: "Warum bleibt der Waldrand vermüllt?", s: [["Modul 7", "Eure Trainingsfotos kamen fast nur aus der Stadt."], ["KI", "Die Müll-KI kennt den Waldboden nicht."], ["Folge", "Dort wird kaum Müll gemeldet und abgeholt."]] },
      routes: { t: "Warum ist der CO₂-Ausstoß hoch?", s: c => [["Modul 5", `Die Sammelroute ist ${c.overhead} % länger als nötig.`], ["Fuhrpark", "Mehr Kilometer heißt mehr Diesel."], ["Folge", "Mehr CO₂ und höhere Kosten für die Stadt."]] },
      satisfaction: { t: "Warum machen weniger Leute mit?", s: c => [["Modul 6", `Die Zufriedenheit liegt bei ${c.S} %.`], ["Bürger:innen", "Wer verärgert ist, trennt weniger sorgfältig."], ["Folge", "Schlechtere Qualität in allen Sortieranlagen."]] },
      energy: { t: "Warum braucht das Rechenzentrum so viel Strom?", s: [["Modul 8", "Du hast das riesige Netz gewählt."], ["Rechenzentrum", "Es wird regelmäßig neu trainiert und braucht dafür viel Energie."], ["Folge", "Ein Teil des CO₂-Vorteils durch Recycling geht wieder verloren."]] },
      ewaste: { t: "Warum wächst der Elektroschrott?", s: [["Modul 4", "Ein Gerät wurde zu früh aufgebrochen."], ["Folge", "Statt einer Reparatur bleibt nur Recycling. Der meiste Wert geht verloren."]] }
    },
    back: n => `Zurück zu Modul ${n}`,
    noChains: ["Keine Kettenreaktionen", "Deine Entscheidungen passen gut zusammen. Prüf im Quiz, ob du das Gelernte auf neue Situationen übertragen kannst."],
    playMore: ["Spiel weitere Module", "Je mehr Module du spielst, desto mehr Zusammenhänge werden hier sichtbar."],
    quizStart: n => `Transfer-Quiz starten (${n} Fragen)`, q: (a, b) => `Frage ${a} von ${b}`, correctN: n => `${n} richtig`,
    right: "Richtig.", notQuite: "Nicht ganz.", nextQ: "Nächste Frage", showResult: "Ergebnis anzeigen",
    quizResult: (a, b) => `${a} von ${b} richtig`,
    quizMsg: s => (s >= 8 ? "Sehr stark. Du kannst das Gelernte auf ganz neue Situationen übertragen." : s >= 5 ? "Gut. Schau dir die Module zu den falschen Antworten noch einmal an." : "Ein Anfang. Spiel die Module noch einmal und versuch es dann erneut."),
    quizAgain: "Quiz wiederholen",
    quiz: [
      ["Eine KI soll auf Röntgenbildern Knochenbrüche finden. Kein Bruch darf übersehen werden. Worauf achtest du am meisten?", ["Precision", "Recall", "Energieverbrauch", "Schwellwert von 100 %"], 1, "Recall misst, welcher Anteil der echten Fälle gefunden wird. Übersehene Brüche wären hier am schlimmsten."],
      ["Ein Spamfilter verschiebt wichtige Mails in den Spam-Ordner. Was hilft am ehesten?", ["Schwellwert senken", "Schwellwert erhöhen", "Mehr Spam löschen", "Filter abschalten"], 1, "Ein höherer Schwellwert macht den Filter strenger: weniger Fehlalarme, dafür rutscht etwas mehr Spam durch. Wie im Line Controller."],
      ["Eine Gesichtserkennung wurde fast nur mit Fotos von Erwachsenen trainiert. Was passiert bei Kindern?", ["Sie funktioniert genauso gut", "Sie funktioniert schlechter", "Sie erkennt Kinder besser", "Das hängt nur vom Licht ab"], 1, "Die Trainingsdaten sind einseitig. Was die KI nie gesehen hat, erkennt sie schlecht, genau wie den Müll am Waldrand."],
      ["Freiwillige beschriften Vogelfotos und machen dabei viele Fehler. Was ist der beste nächste Schritt?", ["Alle Daten löschen", "Eine Stichprobe mit Fachleuten vergleichen und Rückmeldung geben", "Nur noch eine Person beschriften lassen", "Nichts tun, die KI gleicht das aus"], 1, "Ein Goldstandard zeigt, wo die Daten abweichen. Mit Rückmeldung werden die Labels besser, und damit auch die KI."],
      ["Welches Smartphone ist am kreislauffähigsten?", ["Verklebt, sehr dünn, günstig", "Verschraubt, Akku und Display austauschbar", "Aus Verbundmaterial, sehr leicht", "Mit fest eingebautem Akku"], 1, "Lösbare Verbindungen und austauschbare Teile machen Reparatur und Recycling erst möglich."],
      ["Warum ist Reparieren meistens besser als Recyceln?", ["Recycling ist verboten", "Reparieren erhält den Wert und die Energie, die im Produkt stecken", "Reparieren ist immer kostenlos", "Recycelte Rohstoffe sind giftig"], 1, "Beim Recycling bleibt nur der Rohstoff übrig. Bei einer Reparatur bleibt das ganze Produkt erhalten."],
      ["Ein Paketdienst hat 20 Stopps. Warum plant ein Algorithmus die Route?", ["Weil die Zahl möglicher Routen riesig ist", "Weil Menschen nicht Auto fahren können", "Weil der Algorithmus immer die perfekte Route kennt", "Weil Karten veraltet sind"], 0, "Mit jedem Stopp explodiert die Zahl der Routen. Faustregeln wie 2-opt finden schnell eine sehr gute Lösung."],
      ["Eine Stadt führt eine Müllgebühr ein. Die Wirkung zeigt sich erst nach zwei Jahren. Wie nennt man das?", ["Zufall", "Verzögerung im System", "Messfehler", "Sofortwirkung"], 1, "Systeme reagieren oft verzögert. Wer zu früh urteilt, schafft eine gute Maßnahme vielleicht wieder ab."],
      ["Im Sommer steigen Eisverkäufe und Sonnenbrände gleichzeitig. Verursacht Eis Sonnenbrand?", ["Ja, eindeutig", "Nein, beide haben eine gemeinsame Ursache: die Sonne", "Ja, aber nur bei Kindern", "Das kann man nicht wissen"], 1, "Das ist eine Korrelation, keine Ursache. Wie die Regentage im Policy Simulator."],
      ["Übersetzungs-KI A ist 96 % genau und braucht 100-mal so viel Strom wie KI B mit 94 %. Was passt für eine App mit Millionen Nutzenden meist besser?", ["A, Genauigkeit ist alles", "B, genau genug und viel sparsamer", "Keine von beiden", "Beide gleichzeitig"], 1, "Zwei Prozentpunkte mehr rechtfertigen selten den hundertfachen Energiebedarf. Genauigkeit pro Joule zählt."]
    ],
    merk: "Entscheidungen wirken weiter, als man denkt: Verbundmaterial aus dem Designstudio bremst die Sortieranlage, einseitige Trainingsfotos lassen den Waldrand vermüllen, und ein riesiges Netz frisst einen Teil des CO₂-Vorteils wieder auf.",
    concept: [
      { h: "Systemdenken", p: "Wiek et al. (2011) zählen Systemdenken zu den wichtigsten Kompetenzen für Nachhaltigkeit: Zusammenhänge erkennen, statt einzelne Teile isoliert zu betrachten. Kirchherr et al. (2017) zeigen, dass Kreislaufwirtschaft oft auf „Reduce, Reuse, Recycle“ verkürzt wird. Die Stadt macht die Verbindungen sichtbar." },
      { h: "Wie die Stadt rechnet", p: "Jedes Modul liefert eine Kennzahl, zum Beispiel die Label-Genauigkeit oder den Umweg der Sammelroute. Feste Regeln verrechnen diese Zahlen zu Kreislaufquote, CO₂ und Zufriedenheit. Die Kettenreaktionen sind Regeln, die zwei Module verbinden, etwa: Verbundmaterial aus Modul 3 macht der Sortier-KI aus Modul 2 das Leben schwer." },
      { h: "Transfer", p: "Perkins und Salomon (1992) unterscheiden zwischen einfachem und anspruchsvollem Transfer. Anspruchsvoll heißt: Ein Prinzip bewusst auf eine neue Situation übertragen. Das Quiz fragt deshalb nicht nach den Modulen, sondern nach Röntgenbildern, Spamfiltern und Paketdiensten." }
    ],
    terms: [["Systemdenken", "Zusammenhänge statt Einzelteile betrachten"], ["Transfer", "Gelerntes in neuen Situationen anwenden"]]
  },
  en: {
    eyebrow: "Module 9 · Capstone", title: "Your circular city",
    lead: "This is where your results from modules 1 to 8 come together. Some decisions reinforce each other, others cancel each other out. Click a building to go back to its module.",
    kpi: ["Circularity rate", "CO₂ compared to today", "Satisfaction"],
    played: n => `${n} of 8 modules played.`, open: "Still open:", neutral: "Open buildings count as neutral.",
    map: "City map", park: "Park",
    b: { label: "Data lab", line: "Sorting plant", repair: "Repair café", policy: "Town hall", routes: "Vehicle depot", green: "Data centre", sprint: "Citizen data network", tycoon: "Design studio" },
    tile: {
      open: "not played yet",
      label: d => `Labels ${d.acc} % correct`, line: d => `Precision ${d.prec} %${d.composite ? " · problem: composite" : ""}`,
      tycoon: d => `Balance score ${d.score}`, repair: d => (d.solved ? `${d.count} of 3 phones saved` : d.broken ? "Device destroyed" : `only ${d.count} of 3 diagnosed correctly`),
      routes: d => `Route ${d.overhead} % longer than needed`, policy: d => `Rate ${d.R} % · satisfaction ${d.S} %`,
      sprint: d => `Deviation ${d.dev} %${d.diversified ? "" : " · forest edge missing"}`, green: d => `${{ mini: "Mini", medium: "Medium", huge: "Huge" }[d.model]} network`
    },
    legend: ["going well", "average", "problem", "open"],
    chainTitle: "Chain reaction",
    chains: {
      composite: { t: "Why is the sorting plant struggling?", s: [["Module 3", "You chose composite material."], ["Module 2", "The sorting AI struggles to tell composite from PET."], ["Result", "More false alarms; the recycled material loses value."]] },
      labels: { t: "Why does the AI sort things wrongly?", s: c => [["Module 1", `Your labels were only ${c.acc} % correct.`], ["Module 2", "The sorting AI learned from faulty examples."], ["Result", "The same mistake repeats with every package."]] },
      bias: { t: "Why is the forest edge still full of litter?", s: [["Module 7", "Your training photos came almost only from town."], ["AI", "The litter AI doesn't know the forest floor."], ["Result", "Hardly any litter there gets reported and collected."]] },
      routes: { t: "Why are CO₂ emissions high?", s: c => [["Module 5", `The collection route is ${c.overhead} % longer than needed.`], ["Vehicle depot", "More kilometres means more diesel."], ["Result", "More CO₂ and higher costs for the city."]] },
      satisfaction: { t: "Why are fewer people taking part?", s: c => [["Module 6", `Satisfaction is at ${c.S} %.`], ["Residents", "Annoyed people sort their waste less carefully."], ["Result", "Lower quality in every sorting plant."]] },
      energy: { t: "Why does the data centre use so much power?", s: [["Module 8", "You chose the huge network."], ["Data centre", "It is retrained regularly and needs a lot of energy for that."], ["Result", "Part of the CO₂ benefit of recycling is lost again."]] },
      ewaste: { t: "Why is e-waste growing?", s: [["Module 4", "A device was pried open too early."], ["Result", "Instead of a repair, only recycling is left. Most of the value is lost."]] }
    },
    back: n => `Back to module ${n}`,
    noChains: ["No chain reactions", "Your decisions fit together well. Use the quiz to check whether you can apply what you learned to new situations."],
    playMore: ["Play more modules", "The more modules you play, the more connections show up here."],
    quizStart: n => `Start the transfer quiz (${n} questions)`, q: (a, b) => `Question ${a} of ${b}`, correctN: n => `${n} correct`,
    right: "Correct.", notQuite: "Not quite.", nextQ: "Next question", showResult: "Show result",
    quizResult: (a, b) => `${a} of ${b} correct`,
    quizMsg: s => (s >= 8 ? "Very strong. You can apply what you learned to completely new situations." : s >= 5 ? "Good. Have another look at the modules behind the wrong answers." : "A start. Play the modules again and then have another go."),
    quizAgain: "Repeat quiz",
    quiz: [
      ["An AI is meant to find bone fractures on X-rays. No fracture may be missed. What do you focus on most?", ["Precision", "Recall", "Energy use", "A threshold of 100 %"], 1, "Recall measures what share of the real cases is found. Missed fractures would be the worst outcome here."],
      ["A spam filter moves important emails into the spam folder. What is most likely to help?", ["Lower the threshold", "Raise the threshold", "Delete more spam", "Switch the filter off"], 1, "A higher threshold makes the filter stricter: fewer false alarms, a bit more spam gets through. Just like the Line Controller."],
      ["A face-recognition system was trained almost only on photos of adults. What happens with children?", ["It works just as well", "It works worse", "It recognises children better", "It only depends on the lighting"], 1, "The training data are one-sided. What the AI has never seen, it recognises poorly, just like the litter at the forest edge."],
      ["Volunteers label bird photos and make lots of mistakes. What is the best next step?", ["Delete all the data", "Compare a sample with experts and give feedback", "Let only one person label from now on", "Do nothing, the AI will even it out"], 1, "A gold standard shows where the data deviate. With feedback the labels improve, and so does the AI."],
      ["Which smartphone is the most circular?", ["Glued, very thin, cheap", "Screwed together, battery and screen replaceable", "Made of composite, very light", "With a built-in, non-removable battery"], 1, "Detachable joints and replaceable parts are what make repair and recycling possible in the first place."],
      ["Why is repairing usually better than recycling?", ["Recycling is banned", "Repairing keeps the value and energy stored in the product", "Repairing is always free", "Recycled materials are toxic"], 1, "Recycling only keeps the raw material. A repair keeps the whole product."],
      ["A parcel service has 20 stops. Why does an algorithm plan the route?", ["Because the number of possible routes is enormous", "Because people can't drive", "Because the algorithm always knows the perfect route", "Because maps are out of date"], 0, "Every stop makes the number of routes explode. Rules of thumb like 2-opt quickly find a very good solution."],
      ["A city introduces a waste fee. The effect only shows after two years. What is this called?", ["Chance", "A delay in the system", "A measurement error", "An immediate effect"], 1, "Systems often react with a delay. Judging too early can mean scrapping a good measure."],
      ["In summer, ice-cream sales and sunburn rise at the same time. Does ice cream cause sunburn?", ["Yes, clearly", "No, both have a common cause: the sun", "Yes, but only in children", "There's no way to know"], 1, "That is a correlation, not a cause. Like the rainy days in the Policy Simulator."],
      ["Translation AI A is 96 % accurate and uses 100 times the power of AI B at 94 %. Which usually suits an app with millions of users better?", ["A, accuracy is everything", "B, accurate enough and far more frugal", "Neither", "Both at once"], 1, "Two extra percentage points rarely justify a hundredfold energy demand. Accuracy per joule matters."]
    ],
    merk: "Decisions reach further than you think: composite material from the design studio slows down the sorting plant, one-sided training photos leave the forest edge full of litter, and a huge network eats up part of the CO₂ saving.",
    concept: [
      { h: "Systems thinking", p: "Wiek et al. (2011) count systems thinking among the key competencies for sustainability: seeing connections instead of looking at parts in isolation. Kirchherr et al. (2017) show that the circular economy is often reduced to “reduce, reuse, recycle”. The city makes the connections visible." },
      { h: "How the city calculates", p: "Each module delivers one figure, for example label accuracy or the detour of the collection route. Fixed rules combine these figures into circularity rate, CO₂ and satisfaction. The chain reactions are rules that link two modules, such as: composite material from module 3 makes life hard for the sorting AI in module 2." },
      { h: "Transfer", p: "Perkins and Salomon (1992) distinguish between simple and demanding transfer. Demanding means consciously applying a principle to a new situation. That is why the quiz does not ask about the modules, but about X-rays, spam filters and parcel services." }
    ],
    terms: [["Systems thinking", "looking at connections rather than single parts"], ["Transfer", "applying what you learned in new situations"]]
  }
};

function Quiz({ t, onDone }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const Q = t.quiz, [q, rawOpts, rawAns, expl] = Q[i];
  // Antwortreihenfolge mischen (fest pro Frage, damit DE und EN gleich bleiben)
  const order = useMemo(() => shuffle(rawOpts.map((_, k) => k), rng(97 + i * 13)), [i, rawOpts]);
  const opts = order.map(k => rawOpts[k]), ans = order.indexOf(rawAns);
  const pick = k => { if (picked !== null) return; setPicked(k); if (k === ans) setScore(s => s + 1); };
  const next = () => { if (i < Q.length - 1) { setI(i + 1); setPicked(null); } else { setFinished(true); onDone(score); } };
  if (finished) return (
    <div className="res good">
      <div className="eyebrow">Quiz</div>
      <h2>{t.quizResult(score, Q.length)}</h2>
      <p>{t.quizMsg(score)}</p>
      <button className="secondary" onClick={() => { setI(0); setPicked(null); setScore(0); setFinished(false); }}>{t.quizAgain}</button>
    </div>
  );
  return (
    <div className="qcard">
      <div className="row between"><span className="muted strong">{t.q(i + 1, Q.length)}</span><span className="muted">{t.correctN(score)}</span></div>
      <h2>{q}</h2>
      <div className="stack-s">
        {opts.map((o, k) => {
          const st = picked === null ? "" : k === ans ? " right" : k === picked ? " wrong" : "";
          return <button key={k} className={"opt quiz-opt" + st} onClick={() => pick(k)} aria-pressed={picked === k}>{o}</button>;
        })}
      </div>
      {picked !== null && (
        <div className="mt">
          <Why tone={picked === ans ? "ok" : "warn"} title={picked === ans ? t.right : t.notQuite}>{expl}</Why>
          <button className="wide mt" onClick={next}>{i < Q.length - 1 ? t.nextQ : t.showResult}</button>
        </div>
      )}
    </div>
  );
}

export default function Capstone({ results, report }) {
  const t = useText(TEXT);
  const { pick } = useLang();
  const [quiz, setQuiz] = useState(false);
  const city = computeCity(results);
  const mods = MODULES.filter(m => m.n <= 8);
  const played = mods.filter(m => results[m.view]), missing = mods.filter(m => !results[m.view]);
  const mod = v => MODULES.find(m => m.view === v);

  return (
    <section>
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
        <div className="row">
          <div className="pill-kpi"><span>{t.kpi[0]}</span><b><CountUp value={city.circ} suffix=" %" /></b></div>
          <div className="pill-kpi"><span>{t.kpi[1]}</span><b><CountUp value={city.co2} suffix=" %" signed /></b></div>
          <div className="pill-kpi"><span>{t.kpi[2]}</span><b><CountUp value={city.sat} suffix=" %" /></b></div>
        </div>
      </ModuleIntro>
      {missing.length > 0 && (
        <div className="why info mt">
          <b>{t.played(played.length)}</b>
          <div>{t.open} {missing.map((m, k) => <span key={m.n}>{k > 0 && ", "}<a href={"#" + m.view}>{m.n}. {pick(m.title)}</a></span>)}. {t.neutral}</div>
        </div>
      )}
      <div className="split">
        <div className="main stack">
          <section className="card">
            <b>{t.map}</b>
            <CityScene city={city} label={t.map} titles={Object.fromEntries(mods.map(m => [m.view, `${m.n} · ${t.b[m.view]}: ${city.tiles[m.view].status === "open" ? t.tile.open : t.tile[m.view](city.tiles[m.view].data)}`]))} />
            <div className="city mt">
              {BUILDINGS.map(b => {
                if (b.deco) return <div key={b.key} className="city-deco">{t.park}</div>;
                const tile = city.tiles[b.key];
                return (
                  <a key={b.key} href={"#" + b.key} className={"city-tile " + tile.status + " " + b.span}>
                    <span className="ct-mod">{mod(b.key).n} · {pick(mod(b.key).title)}</span>
                    <b>{t.b[b.key]}</b>
                    <span className="ct-txt">{tile.status === "open" ? t.tile.open : t.tile[b.key](tile.data)}</span>
                  </a>
                );
              })}
            </div>
            <div className="legend mt-s">
              {["#DCEFE4|#1E6B4E|solid", "#ECEEEC|#A9B7AD|solid", "#FDE7D6|#C2410C|solid", "#FFFFFF|#A9B7AD|dashed"].map((s, i) => {
                const [bg, bc, st] = s.split("|");
                return <span key={i}><i style={{ background: bg, border: `2px ${st} ${bc}` }} />{t.legend[i]}</span>;
              })}
            </div>
          </section>
          {quiz ? <Quiz t={t} onDone={score => report({ quiz: score, circ: city.circ })} /> : <button className="wide" onClick={() => setQuiz(true)}>{t.quizStart(t.quiz.length)}</button>}
        </div>
        <aside className="side stack">
          {city.chains.length ? city.chains.slice(0, 3).map(c => {
            const ch = t.chains[c.id], steps = typeof ch.s === "function" ? ch.s(c) : ch.s;
            return (
              <section key={c.id} className="why warn">
                <div className="eyebrow" style={{ color: "#9A3412" }}>{t.chainTitle}</div>
                <b style={{ fontSize: 17 }}>{ch.t}</b>
                <ol className="chain-steps">{steps.map(([a, b], j) => <li key={j}><b>{a}:</b> {b}</li>)}</ol>
                <a className="btn mt" href={"#" + c.view} style={{ background: "#9A3412" }}>{t.back(mod(c.view).n)}</a>
              </section>
            );
          }) : <Why tone={played.length >= 4 ? "ok" : "info"} title={(played.length >= 4 ? t.noChains : t.playMore)[0]}>{(played.length >= 4 ? t.noChains : t.playMore)[1]}</Why>}
        </aside>
      </div>
      <div className="stack mt-lg">
        <Tutor module="capstone" ctx={{
          played: played.length, circ: city.circ, co2: city.co2, sat: city.sat,
          chain: city.chains.length ? t.chains[city.chains[0].id].t : null
        }} />
        <Merksatz>{t.merk}</Merksatz>
        <Concept sections={t.concept} terms={t.terms} />
      </div>
    </section>
  );
}
