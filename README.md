# RecyBot 2.0 – Lernspiel zu KI-Literacy und Kreislaufwirtschaft

Master's Project 2, Hochschule Ruhr West, 2026 · Fassou Mathias Kolie, Daniil Gurin, Nestor Mermoz Thea

Dieses Repository enthält alle Materialien, um Anwendung und Pilotstudie nachzuvollziehen:
Quellcode der Webanwendung, Erhebungsinstrumente, vollständige Rohdaten, Auswertungsskript
und die Dokumentation der KI-Nutzung einschließlich der Prompts.

- **Live-Version:** https://recybot-projekt2.netlify.app/#hub
- **Repository:** https://github.com/Kolie11/projekt2-recybot-2
- **Paper:** siehe [`paper/`](paper/)

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| [`app/`](app/) | Quellcode der Webanwendung (React, Vite, TensorFlow.js), Tests, Netlify-Funktion des Assistenten |
| [`pilot/`](pilot/) | Pilotstudie: Fragebogen, Einwilligung, Ablauf, Rohdaten, Codebuch, Auswertungsskript |
| [`ki-nutzung/`](ki-nutzung/) | Dokumentation der eingesetzten KI-Werkzeuge und aller Prompts |
| [`paper/`](paper/) | LaTeX-Quelle und PDF des Papers |

## Anwendung lokal starten

Voraussetzung: Node.js 20 oder neuer.

```bash
cd app
npm install
npm run dev        # Entwicklungsserver
npm test           # 48 Unit-Tests
npm run build      # Produktions-Build in app/dist
```

Optional lädt `npm run fetch-models` die MobileNet-Gewichte für den Offline-Betrieb.
Für den Sprachassistenten wird in Netlify die Umgebungsvariable `GROQ_API_KEY` gesetzt
(siehe `app/.env.example`); ohne Schlüssel arbeitet der Assistent mit Offline-Hinweisen.

## Auswertung der Pilotstudie reproduzieren

Voraussetzung: Python 3.10 oder neuer.

```bash
cd pilot
pip install -r auswertung/requirements.txt
python auswertung/auswertung.py daten/pilotstudie_rohdaten.csv auswertung/loesungsschluessel.json
```

Das Skript berechnet alle im Paper berichteten Kennwerte (Itemlösungen, Mittelwerte,
t-Test, dz, Wilcoxon-Test, SUS, Spielerleben) und schreibt sie nach `pilot/auswertung/ergebnisse.md`.

## Deployment

Netlify: „Import from Git“, **Base directory `app`**. Build-Befehl und Funktionen sind in
`app/netlify.toml` festgelegt.
