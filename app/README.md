# RecyBot 2.0

Lernspiel zu KI-Literacy und Kreislaufwirtschaft für die Sekundarstufe (Master's Project 2, Hochschule Ruhr West).
Zweisprachig (Deutsch / Englisch), React + Vite, echte KI-Modelle im Browser (TensorFlow.js).

## Starten

```bash
npm install
npm run dev      # http://localhost:5173 (Kamera funktioniert auf localhost)
npm test         # 48 Unit-Tests: Spiellogik, Statistik, Ergebnisdateien, Assistent (Vitest)
npm run build    # erzeugt dist/ für Netlify o. ä.
```

### Veröffentlichen

**Empfohlen (ohne Abhängigkeit von fremden Servern im Schulnetz):**

```bash
npm run build:offline   # lädt MobileNet (ca. 14 MB) nach public/models/ und baut dist/
```

Dann den Ordner `dist/` auf app.netlify.com/drop ziehen. TensorFlow.js, MobileNet und die Schriften
liegen danach komplett auf eurem eigenen Server.

- Mit Git-Repository: `netlify.toml` ist vorbereitet, Netlify lädt die Gewichte beim Build selbst.
- Ohne `fetch-models` funktioniert alles genauso; MobileNet wird dann beim ersten Start bei Google geladen.
- Ist gar kein MobileNet erreichbar, rechnen Modul 1 und 7 mit einfachen Bildmerkmalen weiter.

## Die neun Module und ihre KI

| # | Modul | Was wirklich rechnet | In-Game-Metrik |
|---|---|---|---|
| 1 | LabelLab | MobileNet-Embeddings + k-Nächste-Nachbarn, trainiert mit den Labels der Spielenden, getestet an 12 neuen Verpackungen | Label-Genauigkeit, Test-Genauigkeit |
| 2 | Line Controller | MobileNet (ImageNet) oder eigenes Teachable-Machine-Modell, Live-Kamera | Precision / Recall je Szenario |
| 3 | Lifecycle Tycoon | Bewertung aller 27 Varianten, Pareto-Front | Balance-Score |
| 4 | Repair Lab | ID3-Entscheidungsbaum (Entropie, Informationsgewinn) aus 48 Werkstattfällen, Test an 36 neuen | Fragen bis Diagnose |
| 5 | Reverse Logistics | Nächster Nachbar, 2-opt, exakte Suche (bis 8 Stopps) | Route vs. Algorithmus |
| 6 | Policy Simulator | Systemdynamik-Modell, KI-Berater als Suchverfahren mit Zielfunktion | Zielerreichung |
| 7 | Data Sprint | Patch-Klassifikator (MobileNet + kNN) aus den Markierungen, Test pro Ort (Bias) | Abweichung vom Goldstandard |
| 8 | GreenAI Lab | Echtes Training neuronaler Netze (3 Größen) auf NIR-Sensordaten, Energie-Schätzung | Accuracy-per-Joule |
| 9 | Capstone | Verrechnung aller Ergebnisse, Kettenreaktionen, Transfer-Quiz | Transfer-Endquiz |

Ohne Internet (MobileNet nicht ladbar) rechnen Modul 1 und 7 mit einfachen Bildmerkmalen weiter.
In Modul 2 können die Lernenden dann eine eigene Mini-KI anlernen (je zwei oder mehr Beispiele PET / kein PET
per Kamera oder Foto, k-Nächste-Nachbarn auf zentrierten Bildmerkmalen). Mit MobileNet funktioniert das auch,
dann mit MobileNet-Embeddings. In eingebetteten Vorschauen (z. B. claude.ai) ist die Kamera gesperrt; dort
Fotos hochladen oder die Seite direkt öffnen.

## Studie: Vor- und Nachtest (Paper, Abschnitt V)

- **Vortest** (`#vortest`) und **Nachtest** (`#nachtest`): dieselben 12 Aufgaben (6 KI-Literacy, 6 Kreislaufwirtschaft), Antwort „Weiß ich nicht“ möglich, Lösungen erst nach dem Nachtest.
- Danach ein kurzer **Fragebogen** (Interesse, Bedienbarkeit, Anstrengung; Likert 1–5) und ein freiwilliger Kommentar.
- **Codename** statt Klarname verbindet Vor- und Nachtest.
- **Lernbericht** (`#bericht`): Ergebnisse aller Module mit der In-Game-Metrik aus Tabelle I, druckbar als PDF, Export als Ergebnisdatei (JSON) oder Ergebnis-Code.
- **Klassenauswertung** im Lehrkraft-Bereich: Dateien/Codes einlesen → Mittelwerte, t-Test für verbundene Stichproben, Cohen's d, Aufgabenanalyse, Fragebogen-Mittelwerte, CSV-Export (Excel, SPSS, R). Läuft vollständig im Browser.


## KI-Assistent „Frag RecyBot“ (alle 9 Module, mit Sprachausgabe)

Schwebender Knopf unten rechts in jedem Modul. RecyBot erklärt das Modul (gesprochen), gibt Tipps zum aktuellen
Spielstand, erklärt Ergebnisse und Begriffe und beantwortet eigene Fragen. Vorlesen über die Web Speech API des
Browsers (kostenlos, ohne Server); abschaltbar. Die Module melden ihren Spielstand über `src/ai/TutorContext.jsx`.

## Technik-Check (`#check`)

Prüft in ca. 20 Sekunden Speicher, WebGL, TensorFlow.js, Zeichnen der Szenen, MobileNet, Kamera, Sprachausgabe und
den Assistenz-Server und erklärt, was bei Einschränkungen passiert. Für Lehrkräfte vor der Stunde.

## Eingeschränkte Umgebungen

Eingebettete Vorschauen (z. B. claude.ai) verbieten oft Kamera, externe Downloads und blob:-Bilder. RecyBot
zeichnet Szenen dann über einen eigenen Canvas-Zeichner (`src/ml/render.js`), nutzt einfache Bildmerkmale statt
MobileNet und lässt in Modul 2 eine eigene Mini-KI anlernen. Alle Module bleiben spielbar.

### Details zum Sprachmodell

Der Assistent kennt den aktuellen Spielstand (Schwellwert und Konfusionsmatrix, gestellte Diagnosefragen,
Stadtwerte, Herkunft der Trainingsfotos) und gibt sokratische Denkanstöße, ohne Lösungen zu verraten.

- **Mit Sprachmodell (kostenlos):** `netlify/functions/assistant.mjs` leitet Fragen an **Groq** weiter
  (Llama 3.3 70B, Gratis-Zugang ohne Kreditkarte, Anfragen werden standardmäßig nicht gespeichert; bei
  erreichtem Tageslimit automatisch Llama 3.1 8B). Netlify-Umgebungsvariable: `GROQ_API_KEY`.
  Alternativ kostenpflichtig `ANTHROPIC_API_KEY` oder `OPENAI_API_KEY`; optional `AI_PROVIDER`, `AI_MODEL`.
  Gratis-Zugänge von Gemini oder Mistral nicht verwenden: Dort dürfen Anfragen zum Training genutzt werden. Der Schlüssel bleibt auf dem Server. Eingaben werden gekürzt (400 Zeichen,
  8 Nachrichten), pro IP gedrosselt, und der Systemprompt hält das Modell beim Thema, auf Deutsch oder Englisch,
  ohne persönliche Daten. Die Spiellogik liefert dem Modell zusätzlich einen berechneten Hinweis.
- **Ohne Sprachmodell** (kein Schlüssel, Drag-&-Drop-Upload, offline): `src/ai/tutor.js` berechnet Hinweise
  aus dem Spielstand, z. B. im Repair Lab die Frage mit dem höchsten Informationsgewinn.
- Funktionen werden nur bei Deploy über Git oder `npx netlify deploy --prod` mit veröffentlicht.
- Lehrkräfte können den Assistenten im Lehrkraft-Bereich oder per Link (`?assistant=off`) abschalten.

## Aufbau

```
src/
  logic/     reine Spiellogik, Wissenstest, Statistik – ohne Oberfläche, mit Tests (logic.test.js)
  lib/       Speicherung (versioniert), Ergebnisdateien, Metrik-Texte
  ml/        Laden der KI-Modelle (mit Zeitlimit und Wiederholung), Embeddings, Training
  i18n/      Sprachumschaltung und gemeinsame Texte; Modultexte liegen jeweils im Modul
  views/     ein Modul pro Datei, jeweils mit Erklärung „Hinter den Kulissen“
  components/ Fehlergrenze, Kopfzeile, UI-Bausteine
```

- Jedes Modul läuft in einer eigenen Fehlergrenze und wird erst beim Öffnen geladen.
- Gespeicherte Daten (localStorage) sind versioniert und werden beim Lesen geprüft.
- Sprache: Umschalter oben rechts, oder Link mit `?lang=en`.
- Lehrkraft-Bereich: `#lehrkraft`, Glossar: `#glossar`.

## Datenschutz

Alle Modelle laufen lokal im Browser. Kamerabilder und Eingaben werden nicht übertragen.
Gespeichert werden nur Einstellungen, Sprache und Spielstand im Browser.
