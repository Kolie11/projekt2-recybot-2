"""Reproduzierbare Auswertung der RecyBot-2.0-Pilotstudie.

Aufruf (im Ordner pilot/):
    python auswertung/auswertung.py daten/pilotstudie_rohdaten.csv auswertung/loesungsschluessel.json

Erwartet den unveränderten CSV-Export aus Google Forms. Spalten werden über ihren
Anfang erkannt: "Vorher 1" … "Vorher 7", "Nachher 1" … "Nachher 7", "SUS 1" … "SUS 10",
"Motivation 1" … "Motivation 3". Ergebnisse werden in auswertung/ergebnisse.md geschrieben.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats


def find_col(df, prefix):
    hits = [c for c in df.columns if str(c).strip().startswith(prefix + ":") or str(c).strip() == prefix]
    if len(hits) != 1:
        raise SystemExit(f"Spalte '{prefix}' nicht eindeutig gefunden: {hits}")
    return hits[0]


def score(df, phase, key):
    cols = [find_col(df, f"{phase} {i}") for i in range(1, 8)]
    correct = pd.DataFrame({i: df[c].astype(str).str.strip() == key[str(i)].strip()
                            for i, c in zip(range(1, 8), cols)})
    return correct.astype(int)


def sus_score(df):
    cols = [find_col(df, f"SUS {i}") for i in range(1, 11)]
    x = df[cols].astype(float).to_numpy()
    odd = (x[:, 0::2] - 1).sum(axis=1)      # Items 1, 3, 5, 7, 9
    even = (5 - x[:, 1::2]).sum(axis=1)     # Items 2, 4, 6, 8, 10
    return (odd + even) * 2.5


def main(csv_path, key_path):
    df = pd.read_csv(csv_path)
    key = json.loads(Path(key_path).read_text(encoding="utf-8"))
    pre_items, post_items = score(df, "Vorher", key), score(df, "Nachher", key)
    pre, post = pre_items.sum(axis=1), post_items.sum(axis=1)
    d = post - pre
    t = stats.ttest_rel(post, pre)
    dz = d.mean() / d.std(ddof=1)
    w = stats.wilcoxon(post, pre)
    sus = sus_score(df)
    mod_col = find_col(df, "Welche Module hast du gespielt?")
    played = df[mod_col].fillna("").astype(str).str.split(", ")
    modules = {m: int(played.apply(lambda xs: m in xs).sum()) for m in
               ["Modul 1: LabelLab", "Modul 2: Line Controller", "Modul 4: Repair Lab", "Modul 7: Data Sprint", "Weitere Module"]}
    mot = df[[find_col(df, f"Motivation {i}") for i in range(1, 4)]].astype(float)

    lines = [
        "# Ergebnisse der Pilotstudie (automatisch erzeugt)", "",
        f"N = {len(df)}", "",
        "## Wissenstest (richtige Antworten je Item)", "",
        "| Item | Prä | Post |", "| --- | --- | --- |",
        *[f"| {i} | {pre_items[i].sum()} | {post_items[i].sum()} |" for i in range(1, 8)],
        "",
        f"Gesamt Prä: M = {pre.mean():.2f} (SD = {pre.std(ddof=1):.2f})",
        f"Gesamt Post: M = {post.mean():.2f} (SD = {post.std(ddof=1):.2f})",
        f"Verbessert / gleich / verschlechtert: {(d > 0).sum()} / {(d == 0).sum()} / {(d < 0).sum()}",
        f"t({len(d) - 1}) = {t.statistic:.2f}, p = {t.pvalue:.3f}, dz = {dz:.3f}",
        f"Wilcoxon: W = {w.statistic:.1f}, p = {w.pvalue:.3f}",
        "",
        "## Gespielte Module", "",
        *[f"{m}: n = {n}" for m, n in modules.items()],
        f"Module pro Person: M = {played.apply(len).mean():.2f}",
        "",
        "## Usability und Spielerleben", "",
        f"SUS: M = {sus.mean():.1f} (SD = {sus.std(ddof=1):.1f}), Spannweite {sus.min():.1f}–{sus.max():.1f}",
        *[f"{c.split(':')[0]}: M = {mot[c].mean():.2f}" for c in mot.columns],
    ]
    out = Path(__file__).parent / "ergebnisse.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
