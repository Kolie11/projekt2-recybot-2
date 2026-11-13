# Codebuch der Rohdaten

Dateien: `pilotstudie_rohdaten_export.xlsx` (unveränderter Export aus Google Forms) und
`pilotstudie_rohdaten.csv` (dieselben Daten als CSV, UTF-8). Eine Zeile pro teilnehmender Person, N = 11.
Die Spaltenüberschriften enthalten den vollständigen Fragetext.

| Spalte | Bedeutung | Werte |
| --- | --- | --- |
| Zeitraum | Zeitstempel der Abgabe (von Google Forms) | Datum, Uhrzeit |
| Noten | von Google Forms berechnete Punktzahl über Vorher- und Nachher-Test | „x / 14“ |
| Ich bin mindestens 18 Jahre alt … | Einwilligung | „Ja, ich bin einverstanden“ |
| Alter | Alter in Jahren | Zahl |
| Studiengang / Beruf | Freitext | Text |
| Wie viel Vorwissen … Künstlicher Intelligenz? | Selbsteinschätzung | 1 = keins … 5 = sehr viel |
| Wie viel Vorwissen … Circular Economy? | Selbsteinschätzung | 1 = keins … 5 = sehr viel |
| Vorher 1–7 | Wissenstest vor der Nutzung | gewählte Antwortoption (Text) |
| Welche Module hast du gespielt? | Mehrfachauswahl, durch „, “ getrennt | Modul 1, 2, 4, 7, Weitere Module |
| Nachher 1–7 | Wissenstest nach der Nutzung, identische Items | gewählte Antwortoption (Text) |
| SUS 1–10 | System Usability Scale | 1 = stimme gar nicht zu … 5 = stimme voll zu |
| Motivation 1–3 | Spaß, Interesse an den Inhalten, Einsatz im Unterricht bzw. Weiterempfehlung | 1 = stimme gar nicht zu … 5 = stimme voll zu |
| Was hat dir am besten gefallen? / Was war unverständlich …? / Was würdest du verbessern? | offene Fragen, freiwillig | Text |

Hinweise: Die Daten sind nicht bereinigt. In Zeile 10 wurden die offenen Fragen mit „1“, „2“, „3“ beantwortet;
die Antworten bleiben unverändert. Die Punktzahl in „Noten“ stimmt für alle Personen mit der Auswertung
durch `auswertung/auswertung.py` überein. Die Daten enthalten keine Namen oder E-Mail-Adressen.
