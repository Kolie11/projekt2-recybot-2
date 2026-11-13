// Wissenstest für Vor- und Nachtest (identische Aufgaben, Paper Abschnitt V).
// Die Aufgaben fragen nach Konzepten in neuen Kontexten, nicht nach Spielszenen.
// dim: "ai" = KI-Literacy, "ce" = Kreislaufwirtschaft. a = Index der richtigen Antwort.

export const TEST_ITEMS = [
  { id: "ai1", dim: "ai", a: 2,
    de: ["Eine KI soll Äpfel und Birnen auf Fotos unterscheiden. Woher weiß sie, wie eine Birne aussieht?",
      ["Eine Programmiererin schreibt für jede Frucht eine feste Regel.", "Sie weiß es von Anfang an.", "Sie lernt es aus vielen Beispielfotos, auf denen die richtige Antwort steht.", "Sie fragt bei jedem Foto im Internet nach."],
      "Maschinelles Lernen heißt: Das Modell findet Muster in beschrifteten Beispielen (Trainingsdaten)."],
    en: ["An AI is supposed to tell apples from pears in photos. How does it know what a pear looks like?",
      ["A programmer writes a fixed rule for every fruit.", "It knows from the start.", "It learns from many example photos that carry the right answer.", "It looks up every photo on the internet."],
      "Machine learning means the model finds patterns in labelled examples (training data)."] },
  { id: "ai2", dim: "ai", a: 0,
    de: ["In einem Trainingsdatensatz sind viele Katzenfotos fälschlich als „Hund“ beschriftet. Was ist die wahrscheinlichste Folge?",
      ["Die KI verwechselt später häufiger Katzen und Hunde.", "Die KI bemerkt den Fehler und korrigiert ihn selbst.", "Die KI wird dadurch schneller.", "Es hat keine Auswirkung, solange die Fotos scharf sind."],
      "Eine KI übernimmt die Fehler in ihren Labels. Schlechte Daten führen zu schlechten Vorhersagen."],
    en: ["In a training dataset, many cat photos are wrongly labelled “dog”. What is the most likely consequence?",
      ["Later the AI mixes up cats and dogs more often.", "The AI notices the mistake and fixes it itself.", "The AI becomes faster.", "It has no effect as long as the photos are sharp."],
      "An AI inherits the mistakes in its labels. Bad data lead to bad predictions."] },
  { id: "ai3", dim: "ai", a: 1,
    de: ["Eine Sortieranlage meldet 100 Flaschen als PET. 90 davon sind wirklich PET. Welche Kennzahl beschreibt diese 90 %?",
      ["Recall", "Precision", "Energieeffizienz", "Trainingszeit"],
      "Precision: Von allem, was als PET gemeldet wurde, war wie viel wirklich PET? Recall fragt umgekehrt: Wie viel vom echten PET wurde gefunden?"],
    en: ["A sorting plant flags 100 bottles as PET. 90 of them really are PET. Which measure describes these 90 %?",
      ["Recall", "Precision", "Energy efficiency", "Training time"],
      "Precision: of everything flagged as PET, how much really was PET? Recall asks the other way round: how much of the real PET was found?"] },
  { id: "ai4", dim: "ai", a: 3,
    de: ["Ein Modell wurde mit nur zehn Fällen trainiert und liegt bei genau diesen Fällen immer richtig. Bei neuen Fällen irrt es oft. Warum?",
      ["Die neuen Fälle sind fehlerhaft.", "Das Modell ist zu klein.", "Der Computer war zu langsam.", "Es hat sich die wenigen Beispiele gemerkt, statt allgemeine Muster zu lernen."],
      "Das nennt man Überanpassung (Overfitting). Mehr und vielfältigere Daten helfen."],
    en: ["A model was trained on only ten cases and is always right on exactly those cases. On new cases it is often wrong. Why?",
      ["The new cases are faulty.", "The model is too small.", "The computer was too slow.", "It memorised the few examples instead of learning general patterns."],
      "This is called overfitting. More and more varied data help."] },
  { id: "ai5", dim: "ai", a: 2,
    de: ["Eine Sprach-App versteht Menschen mit starkem Dialekt deutlich schlechter. Was ist die wahrscheinlichste Ursache?",
      ["Dialekte sind grammatisch falsch.", "Das Mikrofon ist zu leise eingestellt.", "In den Trainingsdaten kamen kaum Sprecher:innen mit Dialekt vor.", "Die App ist absichtlich so programmiert."],
      "Was in den Trainingsdaten fehlt, kann die KI schlecht. Diese Verzerrung heißt Bias."],
    en: ["A speech app understands people with a strong regional accent much worse. What is the most likely cause?",
      ["Accents are grammatically wrong.", "The microphone is set too quiet.", "The training data contained hardly any speakers with that accent.", "The app is deliberately programmed that way."],
      "What is missing from the training data, the AI does badly. This distortion is called bias."] },
  { id: "ai6", dim: "ai", a: 1,
    de: ["Ein großes KI-Modell ist ein Prozentpunkt genauer als ein kleines, braucht aber zwanzigmal so viel Strom. Welche Frage ist am sinnvollsten?",
      ["Keine, größer ist immer besser.", "Ob der kleine Gewinn an Genauigkeit den Mehrverbrauch rechtfertigt.", "Wie man das kleine Modell abschafft.", "Ob Strom überhaupt etwas mit KI zu tun hat."],
      "Green AI: Genauigkeit und Energie werden gemeinsam bewertet, zum Beispiel als Genauigkeit pro Energie."],
    en: ["A large AI model is one percentage point more accurate than a small one but uses twenty times as much electricity. Which question makes most sense?",
      ["None, bigger is always better.", "Whether the small gain in accuracy justifies the extra energy.", "How to get rid of the small model.", "Whether electricity has anything to do with AI."],
      "Green AI: accuracy and energy are judged together, for example as accuracy per unit of energy."] },
  { id: "ce1", dim: "ce", a: 0,
    de: ["Was ist das wichtigste Ziel der Kreislaufwirtschaft?",
      ["Produkte und Materialien möglichst lange im Umlauf zu halten.", "Möglichst viel Müll zu verbrennen.", "Mehr neue Produkte zu verkaufen.", "Müll in andere Länder zu bringen."],
      "Werte sollen erhalten bleiben: durch langlebiges Design, Reparatur, Wiederverwendung und erst zuletzt Recycling."],
    en: ["What is the main goal of the circular economy?",
      ["Keeping products and materials in use for as long as possible.", "Burning as much waste as possible.", "Selling more new products.", "Shipping waste to other countries."],
      "Value should be kept: through durable design, repair, reuse and only last through recycling."] },
  { id: "ce2", dim: "ce", a: 3,
    de: ["Welche Reihenfolge ist aus Sicht der Kreislaufwirtschaft am besten (zuerst versuchen → zuletzt)?",
      ["Recyceln → Reparieren → Vermeiden → Verbrennen", "Verbrennen → Recyceln → Reparieren → Vermeiden", "Reparieren → Verbrennen → Vermeiden → Recyceln", "Vermeiden → Reparieren → Recyceln → Verbrennen"],
      "Je früher man ansetzt, desto mehr Material und Energie bleibt erhalten. Verbrennen ist die letzte Option."],
    en: ["Which order is best from a circular-economy point of view (try first → last)?",
      ["Recycle → repair → avoid → incinerate", "Incinerate → recycle → repair → avoid", "Repair → incinerate → avoid → recycle", "Avoid → repair → recycle → incinerate"],
      "The earlier you act, the more material and energy is kept. Incineration is the last option."] },
  { id: "ce3", dim: "ce", a: 1,
    de: ["Warum ist eine Chipstüte aus Aluminium und Kunststoff schwer zu recyceln?",
      ["Weil sie zu leicht ist.", "Weil die Materialien fest verbunden sind und sich kaum trennen lassen.", "Weil Aluminium nicht recycelbar ist.", "Weil sie bunt bedruckt ist."],
      "Verbundmaterialien lassen sich kaum sortenrein trennen. Gutes Design denkt das Recycling von Anfang an mit."],
    en: ["Why is a crisp packet made of aluminium and plastic hard to recycle?",
      ["Because it is too light.", "Because the materials are bonded and can hardly be separated.", "Because aluminium cannot be recycled.", "Because it is printed in colour."],
      "Composite materials can hardly be separated into pure streams. Good design considers recycling from the start."] },
  { id: "ce4", dim: "ce", a: 2,
    de: ["Eine Stadt erhöht die Müllgebühren stark. Die Recyclingquote steigt, aber manche Leute laden ihren Müll nun im Wald ab. Wie nennt man das?",
      ["Einen Messfehler", "Einen Zufall", "Eine unerwünschte Nebenwirkung im System", "Eine Sofortwirkung ohne Folgen"],
      "Maßnahmen wirken in Systemen oft auch an Stellen, an die man nicht gedacht hat. Deshalb lohnt es sich, Folgen vorab zu simulieren."],
    en: ["A city raises waste fees sharply. The recycling rate goes up, but some people now dump their rubbish in the woods. What is this called?",
      ["A measurement error", "A coincidence", "An unwanted side effect in the system", "An immediate effect with no consequences"],
      "In systems, measures often have effects where nobody expected them. That is why it pays to simulate consequences first."] },
  { id: "ce5", dim: "ce", a: 0,
    de: ["In Städten mit vielen Radwegen liegt weniger Müll auf der Straße. Was kann man daraus sicher schließen?",
      ["Nichts Sicheres über die Ursache: Beides kann eine gemeinsame Ursache haben.", "Radwege verhindern Müll.", "Müll verhindert Radwege.", "Man sollte überall Radwege bauen, um Müll zu senken."],
      "Korrelation ist nicht Kausalität. Vielleicht investieren manche Städte einfach mehr in beides."],
    en: ["Cities with many cycle lanes have less litter on the streets. What can you conclude for certain?",
      ["Nothing certain about the cause: both might share a common cause.", "Cycle lanes prevent litter.", "Litter prevents cycle lanes.", "Build cycle lanes everywhere to reduce litter."],
      "Correlation is not causation. Perhaps some cities simply invest more in both."] },
  { id: "ce6", dim: "ce", a: 3,
    de: ["Was bedeutet Rücklogistik (Reverse Logistics)?",
      ["Pakete schneller zu Kund:innen liefern", "Lkw rückwärts einparken", "Waren aus dem Ausland importieren", "Gebrauchte Produkte und Materialien zurück zu Reparatur, Wiederverwendung oder Recycling bringen"],
      "Ohne Rücklogistik kein Kreislauf: Altgeräte und Wertstoffe müssen effizient eingesammelt werden."],
    en: ["What does reverse logistics mean?",
      ["Delivering parcels to customers faster", "Reversing lorries into parking spaces", "Importing goods from abroad", "Bringing used products and materials back for repair, reuse or recycling"],
      "No loop without reverse logistics: used devices and materials must be collected efficiently."] }
];

/** Likert-Fragen nach dem Nachtest (1 = stimmt gar nicht … 5 = stimmt völlig). */
export const SURVEY_ITEMS = [
  { id: "int1", scale: "interest", de: "Die Module haben mir Spaß gemacht.", en: "I enjoyed the modules." },
  { id: "int2", scale: "interest", de: "Ich fand die Themen interessant.", en: "I found the topics interesting." },
  { id: "int3", scale: "interest", de: "Ich möchte mehr über KI und Kreislaufwirtschaft erfahren.", en: "I would like to learn more about AI and the circular economy." },
  { id: "use1", scale: "usability", de: "Ich fand mich in der App gut zurecht.", en: "I found my way around the app easily." },
  { id: "load1", scale: "load", de: "Es war anstrengend, die Inhalte zu verstehen.", en: "It took a lot of effort to understand the content." }
];

export function scoreTest(answers) {
  const res = { total: 0, ai: 0, ce: 0, n: TEST_ITEMS.length, nAi: 0, nCe: 0, items: {} };
  TEST_ITEMS.forEach((it, i) => {
    const ok = answers?.[i] === it.a;
    res.items[it.id] = ok;
    if (it.dim === "ai") { res.nAi++; if (ok) res.ai++; } else { res.nCe++; if (ok) res.ce++; }
    if (ok) res.total++;
  });
  res.pct = Math.round(res.total / res.n * 100);
  return res;
}

export function surveyScales(survey) {
  const out = {};
  for (const scale of ["interest", "usability", "load"]) {
    const vals = SURVEY_ITEMS.filter(s => s.scale === scale).map(s => survey?.[s.id]).filter(v => v >= 1 && v <= 5);
    out[scale] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return out;
}
