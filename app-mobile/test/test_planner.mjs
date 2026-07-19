/* Vergleichstest: JS-Planer gegen den Python-Referenzfall
   (backend/planner.py __main__: Bodensee KW29/2026, Hybrid-Kurs + zbV-Aufgabe).
   Erwartungen aus dem verifizierten Python-Lauf:
     - Kurs Di 18-20 besetzt (kind=kurs), Aufgabe Mi 14-17 mit 2 Personen (kind=zbv)
     - Grundbesetzung gedeckt (keine Unterbesetzungs-Warnung)
     - genau 1 Warnung Typ 'kein_schliesser' (Mo 17:30) ODER aehnlich gering
     - Stunden fair verteilt, TJ (Azubi, Mi vm Schule) nie Mi vormittags
*/
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ["holidays.js", "model.js", "planner.js"]) {
  // Browser-plain Skripte in Node ausfuehren (haengen an globalThis.DP)
  new Function(readFileSync(join(here, "..", "src", f), "utf-8"))();
}
const DP = globalThis.DP;

let failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) console.log(`  OK   ${name}`);
  else { failed++; console.log(`  FAIL ${name} ${detail}`); }
};

/* ---- Szenario aufbauen (wie planner.py __main__) ---------------------- */
const doc = DP.model.seedDemo(DP.model.emptyDoc());
const y = 2026, w = 29, loc = 1;

DP.model.insert(doc, "courses", {
  location_id: loc, iso_year: y, iso_week: w, date: "2026-07-14",
  type: "hybrid", title: "Excel Hybrid", start_time: "18:00", end_time: "20:00",
  room_id: 3, staff_needed: 1, role_required: "Trainer", note: null,
});
DP.model.insert(doc, "tasks", {
  location_id: loc, iso_year: y, iso_week: w, date: "2026-07-15",
  title: "umbauen Raum 2+3", room_id: 2, start_time: "14:00", end_time: "17:00",
  staff_needed: 2, role_required: null, note: null,
});

/* ---- Lauf -------------------------------------------------------------- */
const res = DP.planner.generate(doc, loc, y, w);
console.log("Ergebnis:", JSON.stringify({ created: res.created, hours: res.hours, total: res.total_hours }, null, 2));
console.log("Warnungen:", res.warnings.map((x) => x.type + " " + x.date + " " + x.message));

/* ---- Checks ------------------------------------------------------------ */
const as = doc.assignments;
check("Dienstplan geschrieben", as.length === res.created, `(${as.length} vs ${res.created})`);

const kurs = as.filter((a) => a.kind === "kurs");
check("Hybrid-Kurs besetzt (1 Person, Di 18-20)",
  kurs.length === 1 && kurs[0].date === "2026-07-14" && kurs[0].start_time === "18:00" && kurs[0].end_time === "20:00");
const kursEmp = kurs.length ? doc.employees.find((e) => e.id === kurs[0].employee_id) : null;
check("Kurs von Trainer-Rolle uebernommen", !!kursEmp && kursEmp.roles.includes("Trainer"), kursEmp ? kursEmp.kuerzel : "");

const zbv = as.filter((a) => a.kind === "zbv");
check("Aufgabe mit 2 Personen besetzt (Mi 14-17)",
  zbv.length === 2 && zbv.every((a) => a.date === "2026-07-15" && a.start_time === "14:00" && a.end_time === "17:00"));

check("keine Unterbesetzung", !res.warnings.some((x) => x.type === "unterbesetzung"),
  JSON.stringify(res.warnings.filter((x) => x.type === "unterbesetzung")));
check("kein Bedarf unbesetzt", !res.warnings.some((x) => x.type === "bedarf"));
check("Azubi nie unbegleitet", !res.warnings.some((x) => x.type === "azubi_allein"));

// TJ: Mi (2026-07-15) Berufsschule vm -> keine Schicht vor 14:00
const tj = doc.employees.find((e) => e.kuerzel === "TJ");
const tjWedEarly = as.filter((a) => a.employee_id === tj.id && a.date === "2026-07-15" && DP.planner.toMin(a.start_time) < 14 * 60);
check("TJ Mi vormittags frei (Berufsschule)", tjWedEarly.length === 0, JSON.stringify(tjWedEarly));

// MM: Freitag No-Go -> keine Schicht am 2026-07-17
const mm = doc.employees.find((e) => e.kuerzel === "MM");
check("MM Freitag frei (No-Go)", !as.some((a) => a.employee_id === mm.id && a.date === "2026-07-17"));

// Wochenend-Betrieb geschlossen -> keine Schichten Sa/So
check("Sa/So keine Schichten", !as.some((a) => ["2026-07-18", "2026-07-19"].includes(a.date)));

// Stunden: niemand ueber max_hours_week (soll+5)
const over = Object.entries(res.hours).filter(([kz, h]) => {
  const e = doc.employees.find((x) => x.kuerzel === kz);
  return h > (e.max_hours_week || 45);
});
check("Stundenlimits eingehalten", over.length === 0, JSON.stringify(over));

// Fixierte Schicht ueberlebt Neuplanung
const fixed = DP.model.insert(doc, "assignments", {
  location_id: loc, iso_year: y, iso_week: w, employee_id: tj.id,
  date: "2026-07-16", start_time: "09:00", end_time: "12:00",
  kind: "telefon", work_mode: "home", room_id: null, course_id: null,
  task_text: null, status_type: null, locked: 1, auto_generated: 0,
});
DP.planner.generate(doc, loc, y, w);
check("Fixierte Schicht ueberlebt Replan", doc.assignments.some((a) => a.id === fixed.id));

// dateFromISOWeek Konsistenz
check("ISO-Wochen-Daten korrekt", DP.planner.dateFromISOWeek(2026, 29, 1) === "2026-07-13" && DP.planner.dateFromISOWeek(2026, 1, 1) === "2025-12-29");

console.log(failed ? `\n${failed} CHECK(S) FEHLGESCHLAGEN` : "\nALLE CHECKS OK");
process.exit(failed ? 1 : 0);
