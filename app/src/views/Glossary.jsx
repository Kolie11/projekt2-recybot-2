import { useState } from "react";
import { useText } from "../i18n/LangContext.jsx";
import { ModuleIntro } from "../components/ui.jsx";

const TEXT = {
  de: {
    eyebrow: "Nachschlagen", title: "Glossar", lead: "Die wichtigsten Begriffe aus RecyBot, kurz und ohne Fachchinesisch.",
    search: "Begriff suchen", none: "Kein Begriff gefunden.", mod: "Modul",
    terms: [
      ["Künstliche Intelligenz (KI)", "Computerprogramme, die aus Beispielen lernen oder Probleme lösen, für die man sonst menschliches Denken braucht.", [1, 2]],
      ["Maschinelles Lernen", "Die KI bekommt keine festen Regeln, sondern viele Beispiele und findet die Muster selbst.", [1, 4, 7]],
      ["Trainingsdaten", "Die Beispiele, aus denen eine KI lernt. Fehler in den Trainingsdaten lernt die KI mit.", [1, 7]],
      ["Label", "Die richtige Antwort zu einem Beispiel, zum Beispiel „PET“ zu einem Foto einer Flasche.", [1, 7]],
      ["Data Cascade", "Ein kleiner Datenfehler am Anfang wächst durch alle späteren Schritte zu einem großen Problem.", [1, 9]],
      ["Embedding", "Ein Bild wird in eine lange Liste von Zahlen übersetzt. Ähnliche Bilder bekommen ähnliche Zahlen.", [1, 7]],
      ["k-Nächste-Nachbarn (kNN)", "Ein Lernverfahren: Für ein neues Bild sucht die KI die ähnlichsten bekannten Beispiele und übernimmt deren Label.", [1, 7]],
      ["Klassifikator", "Eine KI, die Dinge in Gruppen einteilt, zum Beispiel PET oder kein PET.", [2]],
      ["Schwellwert", "Die Grenze, ab der eine Wahrscheinlichkeit als „Ja“ zählt. Ein Mensch legt sie fest.", [2]],
      ["Konfusionsmatrix", "Eine Tabelle mit vier Feldern: richtig erkannt, Fehlalarm, übersehen, richtig aussortiert.", [2]],
      ["Precision", "Von allem, was die KI als PET meldet: Wie viel ist wirklich PET?", [2]],
      ["Recall", "Von allem echten PET: Wie viel findet die KI?", [2]],
      ["Transfer Learning", "Ein vortrainiertes Modell wird mit wenigen eigenen Beispielen auf eine neue Aufgabe angepasst. So arbeitet Teachable Machine.", [2]],
      ["Design for Circularity", "Produkte so entwerfen, dass man sie reparieren, wiederverwenden und recyceln kann.", [3]],
      ["Pareto-Front", "Alle Lösungen, die man in einem Ziel nur verbessern kann, wenn man in einem anderen schlechter wird.", [3]],
      ["Entscheidungsbaum", "Eine KI, die Schritt für Schritt Ja/Nein-Fragen stellt. Man kann genau nachverfolgen, warum sie entscheidet.", [4]],
      ["Entropie", "Ein Maß für Unordnung. Viele mögliche Ursachen bedeuten hohe Entropie.", [4]],
      ["Informationsgewinn", "Wie stark eine Frage die Unordnung verringert. Der Baum stellt die Frage mit dem größten Gewinn zuerst.", [4]],
      ["Heuristik", "Eine Faustregel, die schnell eine gute, aber nicht immer die beste Lösung findet.", [5]],
      ["Kombinatorische Explosion", "Mit jedem zusätzlichen Element wächst die Zahl der Möglichkeiten so stark, dass man nicht mehr alle ausprobieren kann.", [5]],
      ["Systemdynamik", "Eine Methode, um Systeme mit Beständen, Verzögerungen und Rückkopplungen zu simulieren.", [6]],
      ["Rückkopplung", "Eine Wirkung wirkt auf ihre eigene Ursache zurück, verstärkend oder bremsend.", [6]],
      ["Korrelation und Kausalität", "Zwei Dinge steigen gemeinsam (Korrelation). Das heißt noch nicht, dass das eine das andere verursacht (Kausalität).", [6]],
      ["Zielfunktion", "Die Rechenvorschrift, nach der eine KI „gut“ bewertet. Die KI optimiert genau das, was darin steht, und nichts anderes.", [6]],
      ["Bias", "Eine Verzerrung: Die KI behandelt manche Fälle schlechter, weil sie in den Daten fehlen oder unterrepräsentiert sind.", [7]],
      ["Goldstandard", "Von Fachleuten geprüfte Daten, mit denen man die Qualität anderer Daten vergleicht.", [7]],
      ["Citizen Science", "Bürgerinnen und Bürger sammeln wissenschaftliche Daten, zum Beispiel Fotos von Müll in ihrer Stadt.", [7]],
      ["Neuronales Netz", "Eine KI aus vielen einfachen Recheneinheiten, die in Schichten verbunden sind.", [8]],
      ["Parameter", "Die Zahlen im Inneren eines neuronalen Netzes, die beim Training angepasst werden. Mehr Parameter bedeuten mehr Rechenaufwand.", [8]],
      ["Epoche", "Ein kompletter Durchgang durch alle Trainingsdaten.", [8]],
      ["Accuracy-per-Joule", "Wie viel Genauigkeit eine KI pro eingesetzter Energie liefert.", [8]],
      ["Kreislaufwirtschaft", "Ein Wirtschaftsmodell, in dem Produkte und Materialien so lange wie möglich genutzt werden, statt im Müll zu landen.", [3, 4, 9]]
    ]
  },
  en: {
    eyebrow: "Look it up", title: "Glossary", lead: "The key terms from RecyBot, short and without jargon.",
    search: "Search a term", none: "No term found.", mod: "Module",
    terms: [
      ["Artificial intelligence (AI)", "Computer programs that learn from examples or solve problems that would otherwise need human thinking.", [1, 2]],
      ["Machine learning", "Instead of fixed rules, the AI gets lots of examples and finds the patterns itself.", [1, 4, 7]],
      ["Training data", "The examples an AI learns from. Mistakes in the training data are learned too.", [1, 7]],
      ["Label", "The correct answer for an example, for instance “PET” for a photo of a bottle.", [1, 7]],
      ["Data cascade", "A small data error early on grows through every later step into a big problem.", [1, 9]],
      ["Embedding", "An image is turned into a long list of numbers. Similar images get similar numbers.", [1, 7]],
      ["k-nearest neighbours (kNN)", "A learning method: for a new image, the AI looks for the most similar known examples and takes over their label.", [1, 7]],
      ["Classifier", "An AI that puts things into groups, for example PET or not PET.", [2]],
      ["Threshold", "The cut-off above which a probability counts as “yes”. A human sets it.", [2]],
      ["Confusion matrix", "A table with four cells: correctly found, false alarm, missed, correctly rejected.", [2]],
      ["Precision", "Of everything the AI reports as PET, how much really is PET?", [2]],
      ["Recall", "Of all the real PET, how much does the AI find?", [2]],
      ["Transfer learning", "A pre-trained model is adapted to a new task with a few examples of your own. This is how Teachable Machine works.", [2]],
      ["Design for circularity", "Designing products so they can be repaired, reused and recycled.", [3]],
      ["Pareto front", "All solutions that can only get better on one goal by getting worse on another.", [3]],
      ["Decision tree", "An AI that asks yes/no questions step by step. You can trace exactly why it decides.", [4]],
      ["Entropy", "A measure of disorder. Many possible causes mean high entropy.", [4]],
      ["Information gain", "How much a question reduces the disorder. The tree asks the question with the highest gain first.", [4]],
      ["Heuristic", "A rule of thumb that quickly finds a good, but not always the best, solution.", [5]],
      ["Combinatorial explosion", "Each extra element multiplies the number of possibilities until you can no longer try them all.", [5]],
      ["System dynamics", "A way to simulate systems with stocks, delays and feedback loops.", [6]],
      ["Feedback loop", "An effect acts back on its own cause, either amplifying or dampening it.", [6]],
      ["Correlation vs. causation", "Two things rise together (correlation). That does not mean one causes the other (causation).", [6]],
      ["Objective function", "The formula an AI uses to judge what is “good”. The AI optimises exactly that, and nothing else.", [6]],
      ["Bias", "A distortion: the AI handles some cases worse because they are missing or under-represented in the data.", [7]],
      ["Gold standard", "Data checked by experts, used to measure the quality of other data.", [7]],
      ["Citizen science", "Members of the public collect scientific data, for example photos of litter in their town.", [7]],
      ["Neural network", "An AI made of many simple computing units connected in layers.", [8]],
      ["Parameters", "The numbers inside a neural network that are adjusted during training. More parameters mean more computation.", [8]],
      ["Epoch", "One full pass through all the training data.", [8]],
      ["Accuracy per joule", "How much accuracy an AI delivers for each unit of energy it uses.", [8]],
      ["Circular economy", "An economic model in which products and materials are used for as long as possible instead of ending up as waste.", [3, 4, 9]]
    ]
  }
};

export default function Glossary() {
  const t = useText(TEXT);
  const [q, setQ] = useState("");
  const list = t.terms.filter(([a, b]) => (a + " " + b).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <section className="narrow">
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
      <label className="sr" htmlFor="gq">{t.search}</label>
      <input id="gq" type="search" className="input mt-lg" placeholder={t.search} value={q} onChange={e => setQ(e.target.value)} />
      <dl className="glossary mt">
        {list.map(([term, def, mods]) => (
          <div key={term} className="card">
            <dt>{term}</dt>
            <dd>{def}</dd>
            <dd className="muted">{t.mod} {mods.join(", ")}</dd>
          </div>
        ))}
        {!list.length && <p className="muted">{t.none}</p>}
      </dl>
    </section>
  );
}
