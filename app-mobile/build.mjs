/* Buendelt die App in EINE selbsttragende HTML-Datei (dist/dienstplaner-mobil.html).
   Keine externen Hosts (Artifact-CSP): ExcelJS + alle Module inline.
   Aufruf: node build.mjs */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), "utf-8");
// "</script>" in Inline-Skripten entschaerfen (nur in String-Literalen moeglich)
const js = (src) => src.replace(/<\/script/gi, "<\\/script");

const modules = ["holidays.js", "model.js", "planner.js", "ics.js", "xlsx.js", "excel.js", "storage.js", "ui.js", "glue-artifact.js"];

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#111f30">
<title>Dienstplaner</title>
<style>
${read("src/ui.css")}
</style>
</head>
<body>
<div id="app"></div>
<script>
${modules.map((m) => js(read("src/" + m))).join("\n")}
</script>
</body>
</html>
`;

mkdirSync(join(here, "dist"), { recursive: true });
writeFileSync(join(here, "dist", "dienstplaner-mobil.html"), html, "utf-8");
console.log("OK -> dist/dienstplaner-mobil.html (" + Math.round(html.length / 1024) + " KB)");

// Artifact-Variante: claude.ai liefert doctype/head/body selbst -> nur Seiteninhalt
const artifact = `<title>Dienstplaner</title>
<style>
${read("src/ui.css")}
</style>
<div id="app"></div>
<script>
${modules.map((m) => js(read("src/" + m))).join("\n")}
</script>
`;
writeFileSync(join(here, "dist", "dienstplaner-artifact.html"), artifact, "utf-8");
console.log("OK -> dist/dienstplaner-artifact.html (" + Math.round(artifact.length / 1024) + " KB)");
