/* ICS-Export (Google Kalender) - Port von backend/export_ics.py.
   Mobil-tauglich ohne ZIP: combined-Datei oder je Mitarbeiter eine Datei. */
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});

  const VTIMEZONE = [
    "BEGIN:VTIMEZONE", "TZID:Europe/Berlin",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST",
    "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET",
    "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
  ];

  const KIND_LABEL = { dienst: "Dienst", kurs: "Kurs", telefon: "Telefondienst", zbv: "Sonderaufgabe", event: "Termin" };

  const esc = (s) => String(s == null ? "" : s)
    .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const dt = (dateISO, hhmm) => dateISO.replace(/-/g, "") + "T" + hhmm.replace(":", "") + "00";
  const nextDay = (dateISO) => {
    const [y, m, d] = dateISO.split("-").map(Number);
    const x = new Date(Date.UTC(y, m - 1, d));
    x.setUTCDate(x.getUTCDate() + 1);
    return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
  };
  const stamp = () => {
    const n = new Date();
    const p = (x) => String(x).padStart(2, "0");
    return `${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}T${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
  };

  function gather(doc, locationId, year, week) {
    const loc = DP.model.byId(doc, "locations", locationId);
    const emps = doc.employees.filter((e) => e.location_id === locationId);
    const rooms = {};
    doc.rooms.filter((r) => r.location_id === locationId).forEach((r) => { rooms[r.id] = r.name; });
    const inWeek = (r) => r.location_id === locationId && r.iso_year === year && r.iso_week === week;
    const assigns = doc.assignments.filter(inWeek)
      .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
    const courses = {};
    doc.courses.filter(inWeek).forEach((c) => { courses[c.id] = c; });
    const empIds = new Set(emps.map((e) => e.id));
    const absences = doc.absences.filter(
      (a) => a.iso_year === year && a.iso_week === week && empIds.has(a.employee_id));
    const dates = [];
    for (let d = 1; d <= 7; d++) dates.push(DP.planner.dateFromISOWeek(year, week, d));
    const absCat = {};
    (doc.settings.absence_types || []).forEach((t) => { absCat[t.id] = t; });
    return { loc, emps, rooms, assigns, courses, absences, dates, settings: doc.settings, absCat };
  }

  function summary(a, emp, courses, titleFormat) {
    const base = titleFormat
      .replace("{kuerzel}", emp.kuerzel || emp.name)
      .replace("{start}", a.start_time).replace("{end}", a.end_time)
      .replace("{name}", emp.name);
    let detail = "";
    if (a.kind === "kurs") {
      const c = courses[a.course_id];
      detail = "Kurs: " + (c && c.title ? c.title : "Kurs");
    } else if (a.kind === "zbv") detail = a.task_text || "Sonderaufgabe";
    else if (a.kind === "telefon") detail = "Telefondienst" + (a.work_mode === "home" ? " (Zuhause)" : "");
    else if (a.kind !== "dienst") detail = KIND_LABEL[a.kind] || a.kind;
    return detail ? `${base} · ${detail}` : base;
  }

  function employeeEvents(empId, g) {
    const emp = g.emps.find((e) => e.id === empId);
    const titleFormat = g.settings.title_format || "{kuerzel} {start} bis {end}";
    const ts = stamp();
    const lines = [];

    for (const a of g.assigns) {
      if (a.employee_id !== empId) continue;
      const room = g.rooms[a.room_id];
      const locTxt = g.loc.name + (room ? " · " + room : "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:dp-a${a.id}@dienstplaner`,
        `DTSTAMP:${ts}`,
        `DTSTART;TZID=Europe/Berlin:${dt(a.date, a.start_time)}`,
        `DTEND;TZID=Europe/Berlin:${dt(a.date, a.end_time)}`,
        "SUMMARY:" + esc(summary(a, emp, g.courses, titleFormat)),
        "LOCATION:" + esc(locTxt),
        "END:VEVENT",
      );
    }

    for (const ab of g.absences) {
      if (ab.employee_id !== empId) continue;
      const t = g.absCat[ab.type] || { label: ab.type };
      const start = ab.date || g.dates[0];
      const endIncl = ab.end_date || (ab.date ? ab.date : g.dates[6]);
      const end = nextDay(endIncl);
      const per = ab.period;
      const suffix = per && per !== "ganztags" ? ` (${per})` : "";
      lines.push(
        "BEGIN:VEVENT",
        `UID:dp-ab${ab.id}@dienstplaner`,
        `DTSTAMP:${ts}`,
        `DTSTART;VALUE=DATE:${start.replace(/-/g, "")}`,
        `DTEND;VALUE=DATE:${end.replace(/-/g, "")}`,
        "SUMMARY:" + esc(`${emp.kuerzel} ${t.label}${suffix}`),
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      );
    }
    return lines;
  }

  function wrapCalendar(name, eventLines) {
    const head = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dienstplaner//DE//v1",
      "CALSCALE:GREGORIAN", "X-WR-CALNAME:" + esc(name), "X-WR-TIMEZONE:Europe/Berlin",
      ...VTIMEZONE,
    ];
    return head.concat(eventLines, ["END:VCALENDAR"]).join("\r\n") + "\r\n";
  }

  /** combined: {filename, content}. */
  function exportCombined(doc, locationId, year, week) {
    const g = gather(doc, locationId, year, week);
    const events = [];
    for (const e of g.emps) events.push(...employeeEvents(e.id, g));
    const kw = "KW" + week;
    return {
      filename: `Dienstplan_${g.loc.kuerzel || g.loc.name}_${kw}.ics`,
      content: wrapCalendar(`Dienstplan ${g.loc.name} ${kw}`, events),
    };
  }

  /** perPerson: Array von {employee_id, kuerzel, name, filename, content} (nur mit Terminen). */
  function exportPerPerson(doc, locationId, year, week) {
    const g = gather(doc, locationId, year, week);
    const kw = "KW" + week;
    const out = [];
    for (const e of g.emps) {
      const events = employeeEvents(e.id, g);
      if (!events.length) continue;
      out.push({
        employee_id: e.id, kuerzel: e.kuerzel, name: e.name,
        filename: `${e.kuerzel || e.id}_${kw}.ics`,
        content: wrapCalendar(`${e.name} · ${kw}`, events),
      });
    }
    return out;
  }

  DP.ics = { exportCombined, exportPerPerson };
})();
