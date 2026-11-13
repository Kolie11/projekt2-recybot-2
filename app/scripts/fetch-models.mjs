// Lädt die MobileNet-v2-Gewichte (ImageNet, 1.0, 224) einmalig herunter und legt sie
// unter public/models/mobilenet_v2/ ab. Danach braucht die App für die KI kein Internet mehr
// (außer für ein eigenes Teachable-Machine-Modell).
//
//   npm run fetch-models        (Node 18 oder neuer, mit Internet)
//
// Quelle: dasselbe Modell, das @tensorflow-models/mobilenet sonst bei jedem Start lädt.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "models", "mobilenet_v2");
const BASE = process.env.MOBILENET_BASE || "https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/2";
const SUFFIX = "?tfjs-format=file";

async function get(url, kind) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return kind === "json" ? res.json() : Buffer.from(await res.arrayBuffer());
}

async function main() {
  if (existsSync(join(OUT, "model.json"))) {
    const m = JSON.parse(await readFile(join(OUT, "model.json"), "utf8"));
    const files = m.weightsManifest.flatMap(g => g.paths);
    if (files.every(f => existsSync(join(OUT, f)))) { console.log("MobileNet ist bereits vorhanden:", OUT); return; }
  }
  await mkdir(OUT, { recursive: true });
  console.log("Lade model.json …");
  const model = await get(`${BASE}/model.json${SUFFIX}`, "json");
  const files = model.weightsManifest.flatMap(g => g.paths);
  let total = 0;
  for (const f of files) {
    process.stdout.write(`Lade ${f} … `);
    const buf = await get(`${BASE}/${f}${SUFFIX}`);
    await writeFile(join(OUT, f), buf);
    total += buf.length;
    console.log(`${(buf.length / 1e6).toFixed(1)} MB`);
  }
  await writeFile(join(OUT, "model.json"), JSON.stringify(model));
  console.log(`Fertig: ${files.length} Dateien, ${(total / 1e6).toFixed(1)} MB in ${OUT}`);
  console.log("Jetzt `npm run build` ausführen: die Gewichte landen dann in dist/models/.");
}

main().catch(e => {
  console.error("\nDownload fehlgeschlagen:", e.message);
  console.error("Die App funktioniert trotzdem: Sie lädt MobileNet dann beim ersten Start direkt bei Google.");
  process.exit(1);
});
