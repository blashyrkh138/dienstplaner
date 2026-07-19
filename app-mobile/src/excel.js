/* Excel-Export - Blatt "Aushang" (farbiges Wochenraster) + "Abrechnung".
   Nutzt den eigenen Mini-Schreiber DP.xlsx (kein ExcelJS mehr). */
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});

  const WD = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const MONTHS = ["", "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
    "August", "September", "Oktober", "November", "Dezember"];
  const KIND_MARK = { kurs: "Kurs", telefon: "Tel", zbv: "zbV", event: "Termin" };
  const NAVY = "FF1B2A41";

  const toMin = (t) => { const [h, m] = t.split(":"); return +h * 60 + +m; };
  const argb = (hex) => "FF" + (hex || "#888888").replace("#", "").toUpperCase();

  function textColor(hex) {
    const h = (hex || "#888888").replace("#", "");
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const v = (i) => lin(parseInt(h.slice(i, i + 2), 16) / 255);
    const L = 0.2126 * v(0) + 0.7152 * v(2) + 0.0722 * v(4);
    return L > 0.5 ? "FF12212F" : "FFF2F6FB";
  }

  function absOn(absences, empId, iso, absCat) {
    const out = [];
    for (const ab of absences) {
      if (ab.employee_id !== empId) continue;
      const hit = !ab.date || (ab.end_date && ab.date <= iso && iso <= ab.end_date) || ab.date === iso;
      if (hit) {
        const lbl = (absCat[ab.type] || {}).label || ab.type;
        const per = ab.period;
        out.push(lbl + (per && per !== "ganztags" ? ` (${per})` : ""));
      }
    }
    return out;
  }

  /** Liefert {filename, buffer(Uint8Array)} */
  async function exportExcel(doc, locationId, year, week) {
    const loc = DP.model.byId(doc, "locations", locationId);
    const emps = doc.employees
      .filter((e) => e.location_id === locationId && e.active)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.id - b.id);
    const inWeek = (r) => r.location_id === locationId && r.iso_year === year && r.iso_week === week;
    const assigns = doc.assignments.filter(inWeek).sort((a, b) => a.start_time.localeCompare(b.start_time));
    const empIds = new Set(emps.map((e) => e.id));
    const absences = doc.absences.filter(
      (a) => a.iso_year === year && a.iso_week === week && empIds.has(a.employee_id));
    const absCat = {};
    (doc.settings.absence_types || []).forEach((t) => { absCat[t.id] = t; });
    const dates = [];
    for (let d = 1; d <= 7; d++) dates.push(DP.planner.dateFromISOWeek(year, week, d));

    const d0 = dates[0].split("-"), d6 = dates[6].split("-");
    const rng = `${+d0[2]}.–${+d6[2]}. ${MONTHS[+d6[1]]} ${d6[0]}`;

    const st = DP.xlsx.styles();
    const sTitle = st.get({ bold: true, size: 14, color: NAVY });
    const sHead = st.get({ bold: true, color: "FFF2F6FB", fill: NAVY, border: true, align: { h: "center" } });
    const sHeadLeft = st.get({ bold: true, color: "FFF2F6FB", fill: NAVY, border: true });
    const sCell = st.get({ border: true, align: { h: "center", v: "top", wrap: true } });
    const sNum = st.get({ border: true, align: { h: "center" } });
    const sNumBold = st.get({ bold: true, border: true, align: { h: "center" } });
    const sName = st.get({ border: true });
    const sPos = st.get({ color: "FF1E7B34", border: true, align: { h: "center" } });
    const sNeg = st.get({ color: "FFB00020", border: true, align: { h: "center" } });

    /* ---------------------------- Aushang ---------------------------- */
    const aushang = { name: "Aushang", freeze: { x: 1, y: 3 }, merges: ["A1:H1"], rows: [], cols: [{ w: 26 }] };
    for (let c = 0; c < 7; c++) aushang.cols.push({ w: 15 });

    aushang.rows.push({ h: 24, cells: [{ v: `Dienstplan · ${loc.name} · KW ${week} · ${rng}`, s: sTitle }] });
    aushang.rows.push({ cells: [] });
    aushang.rows.push({
      cells: [{ v: "Mitarbeiter", s: sHeadLeft }].concat(dates.map((iso, i) => {
        const [, m, d] = iso.split("-").map(Number);
        return { v: `${WD[i].slice(0, 2)} ${d}.${m}.`, s: sHead };
      })),
    });

    for (const emp of emps) {
      const sEmp = st.get({ bold: true, color: textColor(emp.color), fill: argb(emp.color), border: true, align: { v: "center" } });
      const cells = [{ v: `${emp.kuerzel || ""}  ${emp.name}`, s: sEmp }];
      for (const iso of dates) {
        const parts = [];
        for (const a of assigns) {
          if (a.employee_id === emp.id && a.date === iso) {
            const mark = KIND_MARK[a.kind] || "";
            const home = a.work_mode === "home" ? " ⌂" : "";
            parts.push(`${a.start_time}–${a.end_time}${mark ? " " + mark : ""}${home}`);
          }
        }
        parts.push(...absOn(absences, emp.id, iso, absCat));
        cells.push({ v: parts.join("\n"), s: sCell });
      }
      aushang.rows.push({ h: 42, cells });
    }

    /* -------------------------- Abrechnung --------------------------- */
    const abr = { name: "Abrechnung", freeze: { x: 1, y: 3 }, merges: ["A1:K1"], rows: [], cols: [{ w: 26 }] };
    for (let c = 0; c < 10; c++) abr.cols.push({ w: 8 });

    abr.rows.push({ cells: [{ v: `Stundenabrechnung · ${loc.name} · KW ${week}`, s: st.get({ bold: true, size: 13, color: NAVY }) }] });
    abr.rows.push({ cells: [] });
    abr.rows.push({
      cells: [{ v: "Mitarbeiter", s: sHeadLeft }]
        .concat(WD.map((w) => ({ v: w.slice(0, 2), s: sHead })))
        .concat([{ v: "Summe", s: sHead }, { v: "Soll", s: sHead }, { v: "Diff", s: sHead }]),
    });

    for (const emp of emps) {
      const dayMin = [0, 0, 0, 0, 0, 0, 0];
      for (const a of assigns) {
        if (a.employee_id !== emp.id || a.kind === "event") continue;
        const idx = dates.indexOf(a.date);
        if (idx >= 0) dayMin[idx] += toMin(a.end_time) - toMin(a.start_time);
      }
      let total = 0;
      const cells = [{ v: `${emp.kuerzel || ""} ${emp.name}`, s: sName }];
      dayMin.forEach((m) => {
        const h = m / 60; total += h;
        cells.push({ v: h ? Math.round(h * 100) / 100 : "", n: !!h, s: sNum });
      });
      const soll = emp.weekly_hours || 0;
      const diff = Math.round((total - soll) * 100) / 100;
      cells.push({ v: Math.round(total * 100) / 100, n: true, s: sNumBold });
      cells.push({ v: soll, n: true, s: sNum });
      cells.push({ v: diff, n: true, s: diff < 0 ? sNeg : sPos });
      abr.rows.push({ cells });
    }

    const buffer = DP.xlsx.build({ sheets: [aushang, abr], stylesXml: st.xml() });
    return { filename: `Dienstplan_${loc.kuerzel || loc.name}_KW${week}.xlsx`, buffer };
  }

  DP.excel = { exportExcel };
})();
