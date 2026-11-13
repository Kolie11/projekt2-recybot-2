// RecyBot-Tutor ohne Sprachmodell: Hinweise, die aus dem aktuellen Spielstand berechnet werden.
// Dient als Rückfallebene, wenn kein KI-Modell erreichbar ist, und liefert dem Sprachmodell
// zusätzlich einen berechneten Hinweis, damit es sich an die Spielmechanik hält.
//
// ctx-Formate je Modul:
//   line:   { scen, scenName, targetP, targetR, threshold, prec, rec, n, nPet, tp, fp, fn, tn, enough }
//   repair: { round, rounds, asked:[{q,a}], best, nLeft, confident, outcome, solved }
//   policy: { year, round, rounds, R, S, budget, goalR, goalS, worst, worstS, dR, dS, over, goals, levers }
//   sprint: { nPhotos, labeled, avgDev, lastDev, extended, trained, rates, shares, locNames }

const pct = v => (v === null || v === undefined ? "–" : `${Math.round(v)} %`);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const T = {
  de: {
    offlineNote: "Offline-Tipp: Ich beziehe mich auf deinen aktuellen Stand.",
    line: {
      few: "Sammle zuerst mindestens sechs Gegenstände, darunter PET und Nicht-PET, oder lade die Beispieldaten. Ohne beides lassen sich Precision und Recall nicht sinnvoll berechnen.",
      precLow: c => `Precision liegt bei ${pct(c.prec)}, dein Ziel sind ${c.targetP} %. ${plural(c.fp, "Fehlalarm landet", "Fehlalarme landen")} auf dem PET-Band. Was passiert, wenn du den Schwellwert erhöhst? Schau, welches Feld der Matrix kleiner wird und welches größer.`,
      recLow: c => `Recall liegt bei ${pct(c.rec)}, dein Ziel sind ${c.targetR} %. ${plural(c.fn, "PET-Teil wird", "PET-Teile werden")} übersehen. Ein niedrigerer Schwellwert lässt mehr auf das Band. Was kostet dich das bei der Precision?`,
      both: c => `Beide Werte liegen unter dem Ziel (Precision ${pct(c.prec)}, Recall ${pct(c.rec)}). Vielleicht gibt es mit diesen Gegenständen gar keinen Schwellwert, der beides schafft. Welche Gegenstände liegen knapp über oder unter ${c.threshold} %?`,
      ok: c => `Bei ${c.threshold} % erreichst du beide Ziele. Probier aus, wie weit du den Schwellwert verschieben kannst, bevor ein Ziel kippt. Je breiter dieser Bereich, desto robuster ist deine Einstellung.`,
      explain: c => `Bei ${c.threshold} %: ${c.tp} richtig erkannt, ${c.fp} Fehlalarme, ${c.fn} übersehen, ${c.tn} richtig aussortiert. Precision: ${c.tp} von ${c.tp + c.fp} gemeldeten Teilen sind wirklich PET (${pct(c.prec)}). Recall: ${c.tp} von ${c.tp + c.fn} PET-Teilen wurden gefunden (${pct(c.rec)}).`,
      concept: "Precision fragt: Wenn die KI „PET“ sagt, stimmt das dann? Recall fragt: Wie viel vom echten PET findet sie? Ein hoher Schwellwert macht die KI vorsichtig (mehr Precision, weniger Recall), ein niedriger macht sie großzügig."
    },
    repair: {
      start: c => `Welche Frage teilt die möglichen Ursachen am besten auf? Laut den Werkstattdaten bringt „${c.best}“ gerade die meiste Information.`,
      narrow: c => `Zu deinen Antworten passen noch ${c.nLeft} Werkstattfälle mit verschiedenen Ursachen. Am besten trennt sie jetzt die Frage „${c.best}“.`,
      confident: c => `Deine Antworten passen jetzt fast nur noch zu einer Ursache (${c.nLeft} ähnliche Werkstattfälle). Trau dich an die Diagnose. Das Gehäuse musst du dafür nicht öffnen.`,
      ok: c => `Richtig, mit ${plural(c.asked.length, "Frage", "Fragen")}. Vergleiche mit dem Entscheidungsbaum: Welche Frage hat er zuerst gestellt, und warum gerade die?`,
      wrong: "Die Diagnose passte nicht. Welche deiner Antworten würde auch zu einer anderen Ursache passen? Überleg, welche Frage die beiden hätte trennen können.",
      broken: "Das Gehäuse zu öffnen war hier nicht nötig. Die meisten Ladeprobleme lassen sich mit Fragen eingrenzen. Erst diagnostizieren, dann eingreifen: Das spart Geld und Elektroschrott.",
      explain: c => (c.asked.length ? `Bisher gefragt: ${c.asked.map(x => `„${x.q}“ (${x.a})`).join(", ")}. Dazu passen noch ${c.nLeft} von 48 Werkstattfällen.` : "Du hast noch keine Frage gestellt. Jede Antwort schließt Ursachen aus."),
      concept: "Ein Entscheidungsbaum stellt zuerst die Frage, die die Fälle am stärksten aufteilt. Das misst man mit dem Informationsgewinn: Wie viel Unsicherheit verschwindet durch die Antwort? So braucht der Baum im Schnitt nur wenige Fragen."
    },
    policy: {
      start: "Neue Container und Kampagnen wirken erst im Jahr danach. Überleg, was du jetzt anstoßen musst, damit es 2027 wirkt. Das Pfand wirkt dagegen sofort.",
      over: c => (c.goals ? `Geschafft: Recycling ${pct(c.R)}, Zufriedenheit ${pct(c.S)}. Welche Entscheidung hat am meisten bewirkt, und wann hast du das gemerkt?` : `Die sechs Jahre sind vorbei: Recycling ${pct(c.R)} (Ziel ${c.goalR} %), Zufriedenheit ${pct(c.S)} (Ziel ${c.goalS} %). Spiel noch einmal und denk an die Verzögerung von einem Jahr.`),
      sat: c => `Die Zufriedenheit liegt bei ${pct(c.S)}. Am unzufriedensten ist ${c.worst} (${pct(c.worstS)}). Dort gibt es wenige Rückgabestellen. Ein hohes Pfand ohne Container in der Nähe ärgert die Leute.`,
      rec: c => `Recycling liegt bei ${pct(c.R)}, das Ziel sind ${c.goalR} %. Das Pfand wirkt sofort, Container und Kampagnen erst im Folgejahr. Was stößt du dieses Jahr für ${c.year + 1} an?`,
      budget: c => `Es sind nur noch ${c.budget.toFixed(2).replace(".", ",")} Mio. € übrig, und ${c.rounds - c.round} Jahre liegen vor dir. Welche Ausgabe bringt pro Euro am meisten?`,
      ok: c => `Gerade stimmen beide Ziele. Achte darauf, dass das Budget für die restlichen ${c.rounds - c.round} Jahre reicht.`,
      explain: c => `Im letzten Jahr hat sich Recycling um ${c.dR >= 0 ? "+" : ""}${c.dR} Punkte und die Zufriedenheit um ${c.dS >= 0 ? "+" : ""}${c.dS} Punkte verändert. Denk daran: Was du ${c.year - 1} entschieden hast, wirkt teilweise erst jetzt.`,
      concept: "In Systemen wirken Maßnahmen oft verzögert und haben Nebenwirkungen. Und nicht alles, was gleichzeitig steigt, hängt ursächlich zusammen: Regen und Rückgabequote steigen zusammen, aber Regen bringt niemanden dazu, Flaschen zurückzugeben."
    },
    label: {
      unlabeled: c => `${plural(c.unlabeled, "Rahmen hat", "Rahmen haben")} noch kein Material. Klick den Rahmen an und wähle rechts das Material.`,
      incomplete: c => `Auf diesem Band liegen ${c.items} Verpackungen, du hast ${c.boxes} Rahmen gezogen. Hast du alle gefunden? Die Lupe hilft bei kleinen Teilen.`,
      ready: "Sieht vollständig aus. Prüf das Band und schau dir die Rückmeldung genau an.",
      wrong: c => `${plural(c.wrong, "Label war", "Labels waren")} falsch. Ein Getränkekarton sieht aus wie Pappe, ist aber Verbundstoff. Genau solche Fehler lernt die KI später mit.`,
      missed: c => `${plural(c.missed, "Verpackung hast", "Verpackungen hast")} du übersehen. Für sie bekommt die KI kein Trainingsbeispiel.`,
      perfect: "Alles richtig auf diesem Band. Weiter zum nächsten.",
      result: c => `Deine KI erkennt im Test ${pct(c.mineAcc * 100)}, mit fehlerfreien Labels wären es ${pct(c.cleanAcc * 100)}. Der Unterschied kommt allein von den Labels. Welcher deiner Fehler hat sich am stärksten ausgewirkt?`,
      explain: c => (c.labelAcc !== null ? `Bisher sind ${pct(c.labelAcc * 100)} deiner Labels richtig (${c.scene + 1} von ${c.scenes} Bändern).` : "Du hast noch kein Band geprüft."),
      concept: "Eine KI lernt aus Beispielen mit Label. Das Label ist die Antwort, die sie nachahmen soll. Falsche Labels bringen ihr falsche Antworten bei, auch wenn der Algorithmus perfekt ist."
    },
    tycoon: {
      composite: "Verbundmaterial lässt sich kaum trennen. Die Sortieranlage in Modul 2 erkennt es schlecht, und im Capstone siehst du die Folgen. Welches Material wäre leichter zu recyceln?",
      badge: "Abzeichen geschafft! Liegt deine Variante auf der Pareto-Front? Probier, ob es eine günstigere Variante gibt, die genauso gut für die Umwelt ist.",
      weak: c => `Dein schwächster Wert ist ${c.weakest} mit ${c.weakestV} Punkten. Der Score zählt den schwächsten Wert stark mit. Welche Entscheidung verbessert genau diesen Wert?`,
      explain: c => `Score ${c.score} von 100. Er setzt sich aus dem Durchschnitt aller fünf Ziele (60 %) und dem schwächsten Ziel (40 %) zusammen. Preis ca. ${c.price} €, Lebensdauer ca. ${c.years} Jahre.`,
      concept: "Ökodesign heißt: Schon beim Entwurf an Reparatur, Haltbarkeit und Recycling denken. Die Pareto-Front zeigt die Varianten, bei denen man ein Ziel nur verbessern kann, wenn man bei einem anderen nachgibt."
    },
    routes: {
      start: "Schau dir zuerst die ganze Karte an. Eine gute Tour kreuzt sich nie und fährt die Punkte grob im Kreis ab.",
      going: c => `Noch ${plural(c.left, "Stopp", "Stopps")}. Wenn sich deine Linie gleich kreuzen würde, gibt es fast immer einen kürzeren Weg.`,
      great: c => `Fast so gut wie der Algorithmus, nur ${c.overhead} % länger. Probier eine größere Stufe: Bei 12 Stopps wird es richtig schwer.`,
      cross: c => `Deine Route ist ${c.overhead} % länger und kreuzt sich ${c.cross}-mal. Genau solche Kreuzungen löst das 2-opt-Verfahren auf. Siehst du im Replay, wo?`,
      long: c => `Deine Route ist ${c.overhead} % länger als die des Algorithmus. Schau im Replay, an welcher Stelle er anders abbiegt.`,
      explain: c => (c.done ? `Deine Tour: ${c.userKm.toFixed(1).replace(".", ",")} km, Algorithmus: ${c.aiKm.toFixed(1).replace(".", ",")} km.` : `Du hast ${c.clicked} von ${c.level} Stopps angeklickt.`),
      concept: "Bei n Stopps gibt es n! mögliche Reihenfolgen. Schon bei 12 Stopps sind das fast 480 Millionen. Deshalb nutzen echte Programme Heuristiken wie „nächster Nachbar“ und verbessern das Ergebnis mit 2-opt."
    },
    green: {
      start: "Starte mit einem kleinen oder mittleren Netz. Ein Lauf mit dem riesigen Netz verbraucht schnell einen großen Teil der 20 kJ.",
      low: c => `Letzter Lauf: ${pct(c.lastAcc)}, Ziel sind 90 %. Mehr Runden oder ein etwas größeres Netz? Vergleiche, was pro Kilojoule mehr bringt.`,
      reached: c => `Ziel erreicht mit ${c.bestApj} % pro kJ. Schaffst du die 90 % mit noch weniger Energie?`,
      budget: "Das Energiebudget ist fast aufgebraucht. Welcher deiner Läufe war der beste Kompromiss?",
      explain: c => (c.runs ? `Du hast ${plural(c.runs, "Netz", "Netze")} trainiert. Letzter Lauf: ${pct(c.lastAcc)} Genauigkeit. Noch ${c.left.toFixed(1).replace(".", ",")} kJ übrig.` : "Du hast noch kein Netz trainiert."),
      concept: "Ein neuronales Netz lernt, indem es seine Parameter in vielen Runden (Epochen) anpasst. Mehr Parameter und mehr Runden kosten mehr Rechenarbeit und damit Energie. Green AI fragt: Wie viel Genauigkeit bekomme ich pro Energie?"
    },
    capstone: {
      open: c => `Noch ${plural(8 - c.played, "Modul ist", "Module sind")} offen. Jedes gespielte Modul verändert deine Stadt.`,
      chain: c => `Schau dir die Kettenreaktion „${c.chain}“ an. Welche Entscheidung in einem früheren Modul hat sie ausgelöst, und was würdest du heute anders machen?`,
      none: "Keine Kettenreaktionen, deine Entscheidungen passen zusammen. Teste im Quiz, ob du die Ideen auf neue Situationen übertragen kannst.",
      explain: c => `Kreislaufquote ${pct(c.circ)}, CO₂ ${c.co2 > 0 ? "+" : ""}${c.co2} %, Zufriedenheit ${pct(c.sat)}. Gespielt: ${c.played} von 8 Modulen.`,
      concept: "Kreislaufwirtschaft ist ein System: Design, Daten, KI, Logistik und Politik beeinflussen sich gegenseitig. Wer das Gelernte auf neue Situationen anwenden kann, hat es wirklich verstanden (Transfer)."
    },
    sprint: {
      label: "Markiere alles, was Müll ist, auch kleine Dinge wie Zigarettenkippen. Blätter, Steine und Pylonen sind kein Müll. Jeder Fehlklick wird später ein falsches Trainingsbeispiel.",
      beforeTrain: c => `Bevor du trainierst: ${pct(c.shares.city * 100)} deiner Fotos kommen aus der Innenstadt, ${pct(c.shares.forest * 100)} vom Waldrand. Was erwartest du, wie gut die KI am Waldrand sein wird?`,
      biased: c => `Am Waldrand ist die KI nur zu ${pct(c.rates.forest)} zuverlässig, in der Innenstadt zu ${pct(c.rates.city)}. Liegt das am Algorithmus oder an den Fotos, aus denen sie gelernt hat?`,
      fixed: c => `Waldrand jetzt ${pct(c.rates.forest)}. Du hast am Algorithmus nichts verändert. Was genau hat den Unterschied gemacht?`,
      explain: c => (c.labeled ? `Du hast ${plural(c.labeled, "Foto", "Fotos")} markiert. Im Schnitt weichen deine Markierungen um ${pct(c.avgDev)} vom Goldstandard ab${c.lastDev !== null ? `, beim letzten Foto um ${pct(c.lastDev)}` : ""}.` : "Du hast noch kein Foto mit dem Goldstandard verglichen."),
      concept: "Ein Modell lernt nur die Welt, die in seinen Daten vorkommt. Fehlen ganze Orte oder Gruppen, entsteht eine Verzerrung (Bias). Abhilfe: vielfältige Daten sammeln und gegen einen Goldstandard prüfen."
    }
  },
  en: {
    offlineNote: "Offline tip: based on where you are right now.",
    line: {
      few: "First collect at least six items, including PET and non-PET, or load the sample data. Without both, precision and recall can't be calculated meaningfully.",
      precLow: c => `Precision is ${pct(c.prec)}, your target is ${c.targetP} %. ${plural(c.fp, "false alarm ends", "false alarms end")} up on the PET belt. What happens if you raise the threshold? Watch which cell of the matrix shrinks and which grows.`,
      recLow: c => `Recall is ${pct(c.rec)}, your target is ${c.targetR} %. ${plural(c.fn, "PET item is", "PET items are")} missed. A lower threshold lets more onto the belt. What does that cost you in precision?`,
      both: c => `Both values are below target (precision ${pct(c.prec)}, recall ${pct(c.rec)}). With these items there may be no threshold that achieves both. Which items sit just above or below ${c.threshold} %?`,
      ok: c => `At ${c.threshold} % you meet both targets. Try how far you can move the threshold before one target breaks. The wider that range, the more robust your setting.`,
      explain: c => `At ${c.threshold} %: ${c.tp} correctly found, ${c.fp} false alarms, ${c.fn} missed, ${c.tn} correctly rejected. Precision: ${c.tp} of ${c.tp + c.fp} flagged items really are PET (${pct(c.prec)}). Recall: ${c.tp} of ${c.tp + c.fn} PET items were found (${pct(c.rec)}).`,
      concept: "Precision asks: when the AI says “PET”, is it right? Recall asks: how much of the real PET does it find? A high threshold makes the AI cautious (more precision, less recall); a low one makes it generous."
    },
    repair: {
      start: c => `Which question splits the possible causes best? According to the repair-shop data, “${c.best}” gives the most information right now.`,
      narrow: c => `${c.nLeft} repair cases with different causes still match your answers. The question “${c.best}” separates them best now.`,
      confident: c => `Your answers now point almost entirely to one cause (${c.nLeft} similar repair cases). Go for the diagnosis. You don't need to open the case for it.`,
      ok: c => `Correct, with ${plural(c.asked.length, "question", "questions")}. Compare with the decision tree: which question did it ask first, and why that one?`,
      wrong: "The diagnosis didn't fit. Which of your answers would also fit another cause? Think about which question could have separated the two.",
      broken: "Opening the case wasn't necessary here. Most charging problems can be narrowed down with questions. Diagnose first, then act: it saves money and e-waste.",
      explain: c => (c.asked.length ? `Asked so far: ${c.asked.map(x => `“${x.q}” (${x.a})`).join(", ")}. ${c.nLeft} of the 48 repair cases still match.` : "You haven't asked a question yet. Every answer rules out causes."),
      concept: "A decision tree first asks the question that splits the cases most strongly. That is measured by information gain: how much uncertainty disappears with the answer? This way the tree needs only a few questions on average."
    },
    policy: {
      start: "New bins and campaigns only take effect the year after. Think about what you need to start now so it works in 2027. The deposit, on the other hand, works immediately.",
      over: c => (c.goals ? `Done: recycling ${pct(c.R)}, satisfaction ${pct(c.S)}. Which decision made the biggest difference, and when did you notice?` : `The six years are over: recycling ${pct(c.R)} (target ${c.goalR} %), satisfaction ${pct(c.S)} (target ${c.goalS} %). Play again and keep the one-year delay in mind.`),
      sat: c => `Satisfaction is ${pct(c.S)}. The least satisfied district is ${c.worst} (${pct(c.worstS)}). There are few return points there. A high deposit with no bins nearby annoys people.`,
      rec: c => `Recycling is ${pct(c.R)}, the target is ${c.goalR} %. The deposit works immediately, bins and campaigns only the following year. What do you start this year for ${c.year + 1}?`,
      budget: c => `Only €${c.budget.toFixed(2)} million is left, with ${c.rounds - c.round} years to go. Which spending gives the most per euro?`,
      ok: c => `Both targets are met right now. Make sure the budget lasts for the remaining ${c.rounds - c.round} years.`,
      explain: c => `Last year recycling changed by ${c.dR >= 0 ? "+" : ""}${c.dR} points and satisfaction by ${c.dS >= 0 ? "+" : ""}${c.dS} points. Remember: some of what you decided in ${c.year - 1} only takes effect now.`,
      concept: "In systems, measures often act with a delay and have side effects. And not everything that rises at the same time is causally linked: rain and return rates rise together, but rain doesn't make anyone return bottles."
    },
    label: {
      unlabeled: c => `${plural(c.unlabeled, "box has", "boxes have")} no material yet. Click the box and choose the material on the right.`,
      incomplete: c => `There are ${c.items} packages on this belt and you have drawn ${c.boxes} boxes. Did you find them all? The magnifier helps with small items.`,
      ready: "Looks complete. Check the belt and read the feedback carefully.",
      wrong: c => `${plural(c.wrong, "label was", "labels were")} wrong. A drink carton looks like cardboard but is composite material. The AI will learn exactly these mistakes later.`,
      missed: c => `You missed ${plural(c.missed, "package", "packages")}. The AI gets no training example for them.`,
      perfect: "Everything correct on this belt. On to the next one.",
      result: c => `Your AI scores ${pct(c.mineAcc * 100)} in the test; with error-free labels it would be ${pct(c.cleanAcc * 100)}. The difference comes only from the labels. Which of your mistakes had the biggest effect?`,
      explain: c => (c.labelAcc !== null ? `So far ${pct(c.labelAcc * 100)} of your labels are correct (${c.scene + 1} of ${c.scenes} belts).` : "You haven't checked a belt yet."),
      concept: "An AI learns from labelled examples. The label is the answer it is supposed to imitate. Wrong labels teach it wrong answers, even if the algorithm is perfect."
    },
    tycoon: {
      composite: "Composite material can hardly be separated. The sorting plant in module 2 recognises it poorly, and you will see the consequences in the capstone. Which material would be easier to recycle?",
      badge: "Badge earned! Is your variant on the Pareto front? Try whether there is a cheaper variant that is just as good for the environment.",
      weak: c => `Your weakest value is ${c.weakest} with ${c.weakestV} points. The score counts the weakest value heavily. Which decision improves exactly this value?`,
      explain: c => `Score ${c.score} of 100. It combines the average of all five goals (60 %) and the weakest goal (40 %). Price about €${c.price}, lifetime about ${c.years} years.`,
      concept: "Eco-design means thinking about repair, durability and recycling at the design stage. The Pareto front shows the variants where one goal can only improve if another one gives way."
    },
    routes: {
      start: "First look at the whole map. A good round never crosses itself and visits the points roughly in a circle.",
      going: c => `${plural(c.left, "stop", "stops")} left. If your line is about to cross itself, there is almost always a shorter way.`,
      great: c => `Almost as good as the algorithm, only ${c.overhead} % longer. Try a bigger level: with 12 stops it gets really hard.`,
      cross: c => `Your route is ${c.overhead} % longer and crosses itself ${c.cross} times. The 2-opt method removes exactly these crossings. Can you spot where in the replay?`,
      long: c => `Your route is ${c.overhead} % longer than the algorithm's. Watch the replay to see where it turns differently.`,
      explain: c => (c.done ? `Your round: ${c.userKm.toFixed(1)} km, algorithm: ${c.aiKm.toFixed(1)} km.` : `You have clicked ${c.clicked} of ${c.level} stops.`),
      concept: "With n stops there are n! possible orders. With 12 stops that is almost 480 million. That is why real software uses heuristics like nearest neighbour and improves the result with 2-opt."
    },
    green: {
      start: "Start with a small or medium network. One run with the huge network quickly uses a large part of the 20 kJ.",
      low: c => `Last run: ${pct(c.lastAcc)}, the target is 90 %. More rounds or a slightly bigger network? Compare which gives more per kilojoule.`,
      reached: c => `Target reached with ${c.bestApj} % per kJ. Can you reach 90 % with even less energy?`,
      budget: "The energy budget is almost used up. Which of your runs was the best compromise?",
      explain: c => (c.runs ? `You have trained ${plural(c.runs, "network", "networks")}. Last run: ${pct(c.lastAcc)} accuracy. ${c.left.toFixed(1)} kJ left.` : "You haven't trained a network yet."),
      concept: "A neural network learns by adjusting its parameters over many rounds (epochs). More parameters and more rounds mean more computation and therefore more energy. Green AI asks: how much accuracy do I get per unit of energy?"
    },
    capstone: {
      open: c => `${plural(8 - c.played, "module is", "modules are")} still open. Every module you play changes your city.`,
      chain: c => `Look at the chain reaction “${c.chain}”. Which decision in an earlier module triggered it, and what would you do differently today?`,
      none: "No chain reactions, your decisions fit together. Use the quiz to test whether you can transfer the ideas to new situations.",
      explain: c => `Circularity ${pct(c.circ)}, CO₂ ${c.co2 > 0 ? "+" : ""}${c.co2} %, satisfaction ${pct(c.sat)}. Played: ${c.played} of 8 modules.`,
      concept: "The circular economy is a system: design, data, AI, logistics and policy influence each other. If you can apply what you learned to new situations, you have really understood it (transfer)."
    },
    sprint: {
      label: "Tag everything that is litter, including small things like cigarette butts. Leaves, stones and traffic cones are not litter. Every wrong click later becomes a wrong training example.",
      beforeTrain: c => `Before you train: ${pct(c.shares.city * 100)} of your photos come from the city centre, ${pct(c.shares.forest * 100)} from the forest edge. How well do you expect the AI to do at the forest edge?`,
      biased: c => `At the forest edge the AI is only ${pct(c.rates.forest)} reliable, in the city centre ${pct(c.rates.city)}. Is that the algorithm's fault or the photos it learned from?`,
      fixed: c => `Forest edge now ${pct(c.rates.forest)}. You didn't change the algorithm. What exactly made the difference?`,
      explain: c => (c.labeled ? `You have tagged ${plural(c.labeled, "photo", "photos")}. On average your tags deviate ${pct(c.avgDev)} from the gold standard${c.lastDev !== null ? `, on the last photo ${pct(c.lastDev)}` : ""}.` : "You haven't compared a photo with the gold standard yet."),
      concept: "A model only learns the world that appears in its data. If whole places or groups are missing, the result is a distortion (bias). The remedy: collect varied data and check it against a gold standard."
    }
  }
};


// Gesprochene Einführung je Modul: Was tue ich hier, was lerne ich?
const INTRO = {
  de: {
    label: "Hallo, ich bin RecyBot. Hier wirst du zur Trainerin oder zum Trainer einer Sortier-KI. Zieh einen Rahmen um jede Verpackung und sag, woraus sie ist. Mit genau deinen Labels trainieren wir danach eine echte KI. So siehst du, wie sehr die Qualität der Daten über die KI entscheidet.",
    line: "In der Sortieranlage schätzt eine KI, wie sicher ein Gegenstand PET ist. Du entscheidest, ab welcher Sicherheit er auf das Recycling-Band darf. Ist der Schwellwert hoch, gibt es wenige Fehlalarme, aber mehr wird übersehen. Probier beide Szenarien aus.",
    tycoon: "Du entwirfst einen Wasserkocher. Material, Verbindungen und Aufbau entscheiden, ob er lange hält, repariert und recycelt werden kann, und ob ihn jemand kauft. Ziel ist eine ausgewogene Variante, kein Rekord in nur einem Bereich.",
    repair: "Drei Handys laden nicht mehr. Finde die Ursache mit möglichst wenigen Ja-Nein-Fragen und öffne das Gehäuse nur, wenn es wirklich nötig ist. Danach vergleichst du dich mit einem Entscheidungsbaum, der aus Werkstattdaten gelernt hat.",
    routes: "Ein Sammelfahrzeug muss alle Stationen anfahren. Klick die Stopps in der Reihenfolge an, die du für die kürzeste hältst. Danach rechnen echte Routen-Algorithmen gegen dich, und du siehst, warum man bei vielen Stopps nicht mehr alle Wege ausprobieren kann.",
    policy: "Du leitest sechs Jahre lang die Abfallpolitik einer Stadt. Pfand, Container, Kampagnen und Reparaturcafés kosten Geld und wirken unterschiedlich schnell. Achte auf Verzögerungen und darauf, wie zufrieden die Viertel sind.",
    sprint: "Wie bei einem Bürgerprojekt markierst du Müll auf Fotos. Deine Markierungen werden zu Trainingsdaten für eine KI. Achte darauf, von welchen Orten die Fotos stammen, denn das bestimmt, wo die KI später gut ist.",
    green: "Ein Infrarot-Sensor misst, wie Kunststoffe Licht zurückwerfen. Du trainierst echte neuronale Netze, die daraus PET, PP, PS und PVC erkennen. Ziel sind mindestens 90 Prozent Genauigkeit, ohne das Energiebudget zu sprengen.",
    capstone: "Hier kommt alles zusammen. Deine Entscheidungen aus den Modulen eins bis acht bauen eine Stadt. Klick auf Gebäude und Kettenreaktionen, um zu verstehen, was zusammenhängt. Am Ende prüft ein Quiz, ob du das Gelernte übertragen kannst."
  },
  en: {
    label: "Hi, I'm RecyBot. Here you become the trainer of a sorting AI. Draw a box around each package and say what it is made of. We then train a real AI with exactly your labels, so you can see how much the quality of the data decides how good the AI is.",
    line: "In the sorting plant, an AI estimates how confident it is that an item is PET. You decide from which confidence it may go onto the recycling belt. A high threshold means few false alarms, but more gets missed. Try both scenarios.",
    tycoon: "You are designing a kettle. Material, joints and construction decide whether it lasts, can be repaired and recycled, and whether anyone buys it. The goal is a balanced design, not a record in just one area.",
    repair: "Three phones won't charge. Find the cause with as few yes-or-no questions as possible and only open the case if you really have to. Afterwards you compare yourself with a decision tree that learned from repair-shop data.",
    routes: "A collection vehicle has to visit every station. Click the stops in the order you think is shortest. Then real routing algorithms compete with you, and you will see why nobody can try every route once there are many stops.",
    policy: "You run a city's waste policy for six years. Deposits, bins, campaigns and repair cafés cost money and take effect at different speeds. Watch out for delays and for how satisfied each district is.",
    sprint: "Like in a citizen-science project, you tag litter on photos. Your tags become training data for an AI. Pay attention to where the photos come from, because that decides where the AI will be good later.",
    green: "An infrared sensor measures how plastics reflect light. You train real neural networks that recognise PET, PP, PS and PVC from it. The goal is at least 90 percent accuracy without blowing the energy budget.",
    capstone: "This is where everything comes together. Your decisions from modules one to eight build a city. Click buildings and chain reactions to see what is connected. At the end, a quiz checks whether you can transfer what you have learned."
  }
};
export const moduleIntro = (module, lang = "de") => (INTRO[lang] || INTRO.de)[module] || "";

/** intent: "intro" | "hint" | "explain" | "concept" */
export function offlineReply(module, intent, ctx, lang = "de") {
  const L = T[lang] || T.de, M = L[module];
  if (intent === "intro") return moduleIntro(module, lang);
  if (!M || !ctx) return "";
  if (intent === "concept") return M.concept;
  if (intent === "explain") return typeof M.explain === "function" ? M.explain(ctx) : M.explain;
  switch (module) {
    case "line":
      if (!ctx.enough) return M.few;
      if (ctx.prec >= ctx.targetP && ctx.rec >= ctx.targetR) return M.ok(ctx);
      if (ctx.prec < ctx.targetP && ctx.rec < ctx.targetR) return M.both(ctx);
      return ctx.prec < ctx.targetP ? M.precLow(ctx) : M.recLow(ctx);
    case "repair":
      if (ctx.outcome === "ok") return M.ok(ctx);
      if (ctx.outcome === "wrong") return M.wrong;
      if (ctx.outcome === "broken") return M.broken;
      if (ctx.confident || !ctx.best) return M.confident(ctx);
      return ctx.asked.length ? M.narrow(ctx) : M.start(ctx);
    case "policy":
      if (ctx.over) return M.over(ctx);
      if (ctx.round === 0) return M.start;
      if (ctx.budget < 1.5) return M.budget(ctx);
      if (ctx.S < ctx.goalS) return M.sat(ctx);
      if (ctx.R < ctx.goalR) return M.rec(ctx);
      return M.ok(ctx);
    case "label":
      if (ctx.phase === "result" && ctx.mineAcc !== null && ctx.mineAcc !== undefined) return M.result(ctx);
      if (ctx.checked) return ctx.wrong ? M.wrong(ctx) : ctx.missed ? M.missed(ctx) : M.perfect;
      if (ctx.unlabeled) return M.unlabeled(ctx);
      return ctx.boxes < ctx.items ? M.incomplete(ctx) : M.ready;
    case "tycoon":
      if (ctx.composite) return M.composite;
      return ctx.badge ? M.badge : M.weak(ctx);
    case "routes":
      if (!ctx.done) return ctx.clicked ? M.going(ctx) : M.start;
      if (ctx.overhead <= 3) return M.great(ctx);
      return ctx.cross > 0 ? M.cross(ctx) : M.long(ctx);
    case "green":
      if (ctx.left < 0.5) return M.budget;
      if (ctx.bestApj !== null && ctx.bestApj !== undefined) return M.reached(ctx);
      return ctx.runs ? M.low(ctx) : M.start;
    case "capstone":
      if (ctx.played < 8) return M.open(ctx);
      return ctx.chain ? M.chain(ctx) : M.none;
    case "sprint":
      if (ctx.trained && ctx.rates) return ctx.extended ? M.fixed(ctx) : M.biased(ctx);
      if (ctx.labeled >= ctx.nPhotos) return M.beforeTrain(ctx);
      return M.label;
    default: return "";
  }
}

/** Freie Frage ohne Sprachmodell: grob einordnen, dann passenden Hinweis geben. */
export function classifyQuestion(text) {
  const s = String(text || "").toLowerCase();
  if (/(was (ist|sind|bedeutet|heißt)|what (is|are|does)|mean|bedeutet|erklär.*begriff|definition)/.test(s)) return "concept";
  if (/(warum|wieso|weshalb|why|erklär|explain|ergebnis|result|wie kommt)/.test(s)) return "explain";
  return "hint";
}

/** Kurze Faktenliste für das Sprachmodell (in der Sprache der Oberfläche). */
export function describeContext(module, ctx, lang = "de") {
  const de = lang === "de";
  const j = (...a) => a.filter(Boolean);
  switch (module) {
    case "line": return j(
      `${de ? "Szenario" : "Scenario"}: ${ctx.scenName} (${de ? "Ziel" : "target"} Precision ≥ ${ctx.targetP} %, Recall ≥ ${ctx.targetR} %)`,
      `${de ? "Schwellwert" : "Threshold"}: ${ctx.threshold} %`,
      `${de ? "Gegenstände" : "Items"}: ${ctx.n} (${ctx.nPet} PET)`,
      ctx.enough ? `TP ${ctx.tp}, FP ${ctx.fp}, FN ${ctx.fn}, TN ${ctx.tn}; Precision ${pct(ctx.prec)}, Recall ${pct(ctx.rec)}` : (de ? "Noch zu wenige Gegenstände für Kennzahlen" : "Not enough items for metrics yet"));
    case "repair": return j(
      `${de ? "Handy" : "Phone"} ${ctx.round + 1}/${ctx.rounds}`,
      ctx.asked.length ? `${de ? "Gestellte Fragen" : "Questions asked"}: ${ctx.asked.map(x => `${x.q} → ${x.a}`).join("; ")}` : (de ? "Noch keine Frage gestellt" : "No question asked yet"),
      `${de ? "Passende Werkstattfälle" : "Matching repair cases"}: ${ctx.nLeft}/48`,
      ctx.best ? `${de ? "Frage mit höchstem Informationsgewinn" : "Question with highest information gain"}: ${ctx.best}` : null,
      ctx.outcome ? `${de ? "Ergebnis" : "Outcome"}: ${ctx.outcome}` : null,
      de ? "Die richtige Ursache ist dem Tutor NICHT bekannt und darf nicht geraten werden." : "The true cause is NOT known to the tutor and must not be guessed.");
    case "policy": return j(
      `${de ? "Jahr" : "Year"} ${ctx.year} (${de ? "Runde" : "round"} ${ctx.round}/${ctx.rounds})`,
      `Recycling ${pct(ctx.R)} (${de ? "Ziel" : "target"} ${ctx.goalR} %), ${de ? "Zufriedenheit" : "satisfaction"} ${pct(ctx.S)} (${de ? "Ziel" : "target"} ${ctx.goalS} %)`,
      `Budget ${ctx.budget.toFixed(2)} Mio. €`,
      `${de ? "Stellschrauben" : "Levers"}: ${ctx.levers}`,
      `${de ? "Unzufriedenstes Viertel" : "Least satisfied district"}: ${ctx.worst} (${pct(ctx.worstS)})`,
      ctx.round > 0 ? `${de ? "Veränderung letztes Jahr" : "Change last year"}: Recycling ${ctx.dR >= 0 ? "+" : ""}${ctx.dR}, ${de ? "Zufriedenheit" : "satisfaction"} ${ctx.dS >= 0 ? "+" : ""}${ctx.dS}` : null,
      de ? "Modellregeln: Pfand wirkt sofort; Container und Kampagnen wirken erst im Folgejahr; hohes Pfand ohne Rückgabestellen senkt die Zufriedenheit; Regen korreliert mit der Quote, ist aber keine Ursache."
        : "Model rules: deposit works immediately; bins and campaigns only the following year; a high deposit without return points lowers satisfaction; rain correlates with the rate but is not a cause.");
    case "sprint": return j(
      `${de ? "Fotos markiert" : "Photos tagged"}: ${ctx.labeled}/${ctx.nPhotos}`,
      ctx.avgDev !== null ? `${de ? "Ø Abweichung vom Goldstandard" : "Avg. deviation from gold standard"}: ${pct(ctx.avgDev)}` : null,
      `${de ? "Herkunft der Trainingsfotos" : "Origin of training photos"}: ${Object.entries(ctx.shares).map(([k, v]) => `${ctx.locNames[k]} ${pct(v * 100)}`).join(", ")}`,
      ctx.rates ? `${de ? "Zuverlässigkeit im Test" : "Reliability in the test"}: ${Object.entries(ctx.rates).map(([k, v]) => `${ctx.locNames[k]} ${pct(v)}`).join(", ")}` : (de ? "KI noch nicht trainiert" : "AI not trained yet"),
      ctx.extended ? (de ? "Waldfotos wurden ergänzt" : "Forest photos were added") : null);
    default:
      // Übrige Module: Spielstand als kurze Schlüssel-Wert-Liste
      return Object.entries(ctx || {}).filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
        .map(([k, v]) => `${k}: ${typeof v === "number" ? Math.round(v * 100) / 100 : v}`).slice(0, 12);
  }
}
