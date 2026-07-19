/* Export-Test: ICS + Excel aus dem JS-Kern erzeugen und auf Platte schreiben.
   Die inhaltliche Gegenpruefung (openpyxl, ICS-Parse) macht ein Python-Schritt. */
import { createRequire } from "module";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));

for (const f of ["holidays.js", "model.js", "planner.js", "ics.js", "xlsx.js", "excel.js", "storage.js"]) {
  new Function(readFileSync(join(here, "..", "src", f), "utf-8"))();
}
const DP = globalThis.DP;

const doc = DP.model.seedDemo(DP.model.emptyDoc());
const y = 2026, w = 29, loc = 1;
DP.model.insert(doc, "courses", {
  location_id: loc, iso_year: y, iso_week: w, date: "2026-07-14",
  type: "hybrid", title: "Excel Hybrid", start_time: "18:00", end_time: "20:00",
  room_id: 3, staff_needed: 1, role_required: "Trainer", note: null,
});
DP.model.insert(doc, "absences", {
  employee_id: 4, iso_year: y, iso_week: w, date: "2026-07-16", end_date: null,
  type: "urlaub", priority: "fix", period: "ganztags", start_time: null, end_time: null, note: null,
});
DP.planner.generate(doc, loc, y, w);

const out = join(here, "out");
mkdirSync(out, { recursive: true });

/* ICS combined + pro Person */
const comb = DP.ics.exportCombined(doc, loc, y, w);
writeFileSync(join(out, comb.filename), comb.content, "utf-8");
const per = DP.ics.exportPerPerson(doc, loc, y, w);
per.forEach((p) => writeFileSync(join(out, p.filename), p.content, "utf-8"));
console.log("ICS:", comb.filename, "+", per.length, "pro-Person-Dateien");
const nEvents = (comb.content.match(/BEGIN:VEVENT/g) || []).length;
console.log("VEVENTs combined:", nEvents);
if (nEvents < 5) { console.log("FAIL: zu wenige Events"); process.exit(1); }

/* Excel */
const xl = await DP.excel.exportExcel(doc, loc, y, w);
writeFileSync(join(out, xl.filename), Buffer.from(xl.buffer));
console.log("XLSX:", xl.filename, xl.buffer.length, "bytes");

/* Storage roundtrip (ohne Browser: nur export/import Logik) */
DP.storage.state.doc = doc;
const exp = DP.storage.exportJSON();
const doc2 = DP.storage.importJSON(exp.content);
if (doc2.employees.length !== doc.employees.length) { console.log("FAIL storage roundtrip"); process.exit(1); }
console.log("Storage-Roundtrip OK (", exp.filename, ")");
console.log("EXPORT-TESTS OK");
