/* Auto-Planer - 1:1-Portierung von backend/planner.py.
   Arbeitet auf dem JSON-Dokument (DP.model) statt SQLite.
   Wochentag-Konvention: 0=Mo .. 6=So. Zeiten als "HH:MM". */
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});

  const DAY_SPLIT = 14 * 60;

  /* ------------------------------ Zeit-Helfer ------------------------- */
  const toMin = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":");
    return +h * 60 + +m;
  };
  const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const overlaps = (aS, aE, bS, bE) => aS < bE && bS < aE;
  const isFree = (intervals, s, e) => intervals.every(([bs, be]) => !overlaps(s, e, bs, be));

  /* ISO-Wochen-Helfer (Datum <-> KW) */
  function isoWeekOf(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((d - firstThu) / 864e5 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
    return { year: d.getUTCFullYear(), week };
  }
  /** Datum (lokal) des Wochentags `dow` (1=Mo..7=So) der ISO-Woche year/week. */
  function dateFromISOWeek(year, week, dow) {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const mon1 = new Date(jan4);
    mon1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
    const d = new Date(mon1);
    d.setUTCDate(mon1.getUTCDate() + (week - 1) * 7 + (dow - 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  const weekdayOfISO = (isoDate) => {
    const [y, m, d] = isoDate.split("-").map(Number);
    return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0=Mo
  };
  const prevDateISO = (isoDate) => {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - 1);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  };

  /* ------------------------------ Kontext ----------------------------- */
  function loadContext(doc, locationId, year, week) {
    const loc = DP.model.byId(doc, "locations", locationId);
    const emps = doc.employees
      .filter((e) => e.location_id === locationId && e.active)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.id - b.id);
    const empIds = new Set(emps.map((e) => e.id));

    const op = {};
    doc.operating_hours.filter((r) => r.location_id === locationId).forEach((r) => { op[r.weekday] = r; });

    const cov = {};
    doc.coverage_blocks.filter((r) => r.location_id === locationId).forEach((r) => {
      (cov[r.weekday] = cov[r.weekday] || []).push(r);
    });

    const inWeek = (r) => r.location_id === locationId && r.iso_year === year && r.iso_week === week;
    const courses = doc.courses.filter(inWeek);
    const tasks = doc.tasks.filter(inWeek);

    const special = {};
    doc.special_days.filter((r) => r.location_id === locationId).forEach((r) => { special[r.date] = r; });

    const absences = {};
    emps.forEach((e) => { absences[e.id] = []; });
    doc.absences.forEach((a) => {
      if (a.iso_year === year && a.iso_week === week && empIds.has(a.employee_id))
        absences[a.employee_id].push(a);
    });

    const wa = {};
    doc.week_availability.forEach((r) => {
      if (r.iso_year === year && r.iso_week === week && empIds.has(r.employee_id))
        wa[r.employee_id + ":" + r.weekday] = r.mode;
    });

    const locked = doc.assignments.filter((a) => inWeek(a) && a.locked);

    return { loc, employees: emps, op, cov, courses, tasks, special, absences, wa, locked, settings: doc.settings };
  }

  /* --------------------------- Verfuegbarkeit ------------------------- */
  function dayOpenClose(ctx, weekday, dateISO) {
    const sp = ctx.special[dateISO];
    if (sp) {
      if (sp.closed) return null;
      if (sp.open_time && sp.close_time) return [toMin(sp.open_time), toMin(sp.close_time)];
    }
    const row = ctx.op[weekday];
    if (!row || row.closed || !row.open_time) return null;
    return [toMin(row.open_time), toMin(row.close_time)];
  }

  function absenceHits(a, dateISO) {
    if (!a.date) return true;
    if (a.end_date) return a.date <= dateISO && dateISO <= a.end_date;
    return a.date === dateISO;
  }

  /** Onsite-Fenster [start,end] oder null; soft=true bei Wunsch-frei. */
  function onsiteWindow(emp, weekday, dateISO, dopen, dclose, ctx) {
    let start = dopen, end = dclose, soft = false;

    let mode = (emp.availability || {})[String(weekday)] || "yes";
    const ov = ctx.wa[emp.id + ":" + weekday];
    if (ov) mode = ov;
    if (mode === "no" || mode === "home") return { window: null, soft: false };
    if (mode === "vm") end = Math.min(end, DAY_SPLIT);
    else if (mode === "nm") start = Math.max(start, DAY_SPLIT);

    if ((emp.nogo || []).includes(weekday)) return { window: null, soft: false };

    for (const s of emp.school || []) {
      if (s.weekday === weekday) {
        const p = s.period || "ganztags";
        if (p === "ganztags") return { window: null, soft: false };
        if (p === "vm") start = Math.max(start, DAY_SPLIT);
        else if (p === "nm") end = Math.min(end, DAY_SPLIT);
      }
    }

    for (const a of ctx.absences[emp.id] || []) {
      if (!absenceHits(a, dateISO)) continue;
      if (a.priority === "wunsch") { soft = true; continue; }
      const p = a.period || "ganztags";
      if (p === "ganztags") return { window: null, soft: false };
      if (p === "vm") start = Math.max(start, DAY_SPLIT);
      else if (p === "nm") end = Math.min(end, DAY_SPLIT);
      else if (p === "custom" && a.start_time && a.end_time) {
        const as = toMin(a.start_time), ae = toMin(a.end_time);
        if (as <= start && ae >= end) return { window: null, soft: false };
        if (as <= start && start < ae) start = ae;
        if (as < end && end <= ae) end = as;
      }
    }

    if (emp.earliest_start) start = Math.max(start, toMin(emp.earliest_start));
    if (emp.latest_end) end = Math.min(end, toMin(emp.latest_end));

    if (start >= end) return { window: null, soft: false };
    return { window: [start, end], soft };
  }

  /* ------------------------------ Planer ------------------------------ */
  function generate(doc, locationId, year, week, mode = "replan") {
    const ctx = loadContext(doc, locationId, year, week);
    const settings = ctx.settings || {};
    const plannerCfg = settings.planner || {};
    const rules = plannerCfg.rules || {};

    const emps = ctx.employees;
    const byIdMap = {};
    emps.forEach((e) => { byIdMap[e.id] = e; });

    const busy = {};                 // "empId:date" -> [[s,e],...]
    const minutes = {};              // empId -> geleistete Minuten
    const dayLastEnd = {};           // "empId:date" -> spaetestes Ende
    const warnings = [];
    const created = [];
    emps.forEach((e) => { minutes[e.id] = 0; });

    for (const a of ctx.locked) {
      const key = a.employee_id + ":" + a.date;
      (busy[key] = busy[key] || []).push([toMin(a.start_time), toMin(a.end_time)]);
      minutes[a.employee_id] = (minutes[a.employee_id] || 0) + (toMin(a.end_time) - toMin(a.start_time));
    }

    const dates = [];
    for (let d = 1; d <= 7; d++) dates.push(dateFromISOWeek(year, week, d));

    const fairnessKey = (emp) => {
      const soll = (emp.weekly_hours || 40) * 60;
      const ratio = soll ? (minutes[emp.id] || 0) / soll : 1.0;
      return [ratio, -(emp.can_open_close ? 1 : 0), emp.id];
    };
    const cmpFair = (a, b) => {
      const ka = fairnessKey(a), kb = fairnessKey(b);
      for (let i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return 0;
    };

    function assign(emp, dISO, start, end, kind, opts = {}) {
      const key = emp.id + ":" + dISO;
      (busy[key] = busy[key] || []).push([start, end]);
      minutes[emp.id] = (minutes[emp.id] || 0) + (end - start);
      dayLastEnd[key] = Math.max(dayLastEnd[key] || 0, end);
      created.push({
        location_id: locationId, iso_year: year, iso_week: week,
        employee_id: emp.id, date: dISO,
        start_time: toHHMM(start), end_time: toHHMM(end),
        kind, work_mode: opts.work_mode || "onsite",
        room_id: opts.room_id || null, course_id: opts.course_id || null,
        task_text: opts.task_text || null, status_type: null,
        locked: 0, auto_generated: 1,
      });
    }

    function eligible(emp, dISO, weekday, start, end, needRole) {
      const { window, soft } = onsiteWindow(emp, weekday, dISO, start, end, ctx);
      if (!window) return { ok: false, soft: false };
      const [ws, we] = window;
      if (start < ws || end > we) return { ok: false, soft: false };
      const key = emp.id + ":" + dISO;
      if (!isFree(busy[key] || [], start, end)) return { ok: false, soft: false };

      const alreadyToday = (busy[key] || []).reduce((s, [a, b]) => s + (b - a), 0);
      const maxday = (emp.max_hours_day || 10) * 60;
      if (alreadyToday + (end - start) > maxday && (rules.max_hours_day || "warn") === "enforce")
        return { ok: false, soft: false };

      const maxweek = (emp.max_hours_week || (emp.weekly_hours || 40) + 5) * 60;
      if ((minutes[emp.id] || 0) + (end - start) > maxweek && (rules.max_hours_week || "warn") === "enforce")
        return { ok: false, soft: false };

      const restH = emp.min_rest_hours || 11;
      const prev = dayLastEnd[emp.id + ":" + prevDateISO(dISO)];
      if (prev !== undefined) {
        const gapH = ((24 * 60 - prev) + start) / 60;
        if (gapH < restH && (rules.rest_time || "warn") === "enforce")
          return { ok: false, soft: false };
      }

      if (needRole && !(emp.roles || []).includes(needRole)) return { ok: true, soft: true };
      return { ok: true, soft };
    }

    /* ---- 1) feste Bedarfe: Kurse mit Personal, dann Aufgaben ----------
       Mehrtaegige Kurse (end_date) erzeugen Bedarf an JEDEM Tag im Zeitraum
       (gleiche Uhrzeiten), begrenzt auf die Tage dieser Woche. */
    const weekSet = new Set(dates);
    const demands = [];
    for (const c of ctx.courses) {
      if ((c.staff_needed || 0) > 0) {
        const courseDays = [];
        if (c.end_date && c.end_date > c.date) {
          for (const d of dates) if (d >= c.date && d <= c.end_date) courseDays.push(d);
        } else if (weekSet.has(c.date)) courseDays.push(c.date);
        for (const d of courseDays)
          demands.push({
            date: d, start: toMin(c.start_time), end: toMin(c.end_time),
            count: c.staff_needed, role: c.role_required || null,
            kind: "kurs", room_id: c.room_id || null, course_id: c.id,
            label: c.title || "Kurs",
          });
      }
    }
    for (const t of ctx.tasks) {
      demands.push({
        date: t.date, start: toMin(t.start_time), end: toMin(t.end_time),
        count: t.staff_needed || 1, role: t.role_required || null,
        kind: "zbv", room_id: t.room_id || null, task_text: t.title || null,
        label: t.title || "Aufgabe",
      });
    }

    for (const dm of demands) {
      if (dm.start == null || dm.end == null) continue;
      const weekday = weekdayOfISO(dm.date);
      let picked = 0;
      let cands = [...emps].sort(cmpFair);
      cands = [
        ...cands.filter((e) => !dm.role || (e.roles || []).includes(dm.role)),
        ...cands.filter((e) => dm.role && !(e.roles || []).includes(dm.role)),
      ];
      for (const emp of cands) {
        if (picked >= dm.count) break;
        const { ok } = eligible(emp, dm.date, weekday, dm.start, dm.end, dm.role);
        if (ok) {
          assign(emp, dm.date, dm.start, dm.end, dm.kind, {
            room_id: dm.room_id, course_id: dm.course_id, task_text: dm.task_text,
          });
          picked++;
        }
      }
      if (picked < dm.count)
        warnings.push({
          type: "bedarf", date: dm.date, severity: "warn",
          message: `${dm.label} (${toHHMM(dm.start)}-${toHHMM(dm.end)}): ${dm.count - picked} Person(en) fehlen`,
        });
    }

    /* ---- 2) Grundbesetzung fair auffuellen ---------------------------- */
    const step = ((settings.view || {}).step_minutes | 0) || 30;
    for (const dISO of dates) {
      const weekday = weekdayOfISO(dISO);
      const oc = dayOpenClose(ctx, weekday, dISO);
      if (!oc) continue;
      const [dopen, dclose] = oc;
      const blocks = ctx.cov[weekday] || [];
      if (!blocks.length) continue;

      const steps = [];
      for (let s = dopen; s < dclose; s += step) steps.push(s);
      const need = steps.map((s) => Math.max(0, ...blocks
        .filter((b) => toMin(b.start_time) <= s && s < toMin(b.end_time))
        .map((b) => b.min_staff)));
      const covered = steps.map(() => 0);

      for (const emp of emps) {
        for (const [bs, be] of busy[emp.id + ":" + dISO] || []) {
          steps.forEach((s, i) => { if (bs <= s && s < be) covered[i]++; });
        }
      }

      let guard = 0;
      while (steps.some((_, i) => need[i] > covered[i]) && guard < 200) {
        guard++;
        const gapI = steps.findIndex((_, i) => need[i] > covered[i]);
        const gapStart = steps[gapI];

        let best = null;
        let cands = [...emps].sort(cmpFair);
        if (covered[gapI] === 0) {
          cands = [
            ...cands.filter((e) => e.can_work_alone),
            ...cands.filter((e) => !e.can_work_alone),
          ];
        }
        for (const emp of cands) {
          const { ok, soft } = eligible(emp, dISO, weekday, gapStart, gapStart + step, null);
          if (ok) { best = { emp, soft }; if (!soft) break; }
        }
        if (!best) {
          let last = gapI;
          while (last < steps.length && need[last] > covered[last]) last++;
          warnings.push({
            type: "unterbesetzung", date: dISO, severity: "high",
            message: `Unterbesetzung ${toHHMM(gapStart)}-${toHHMM(steps[last - 1] + step)}`,
          });
          for (let i = gapI; i < last; i++) covered[i] = need[i];
          continue;
        }

        const emp = best.emp;
        const { window } = onsiteWindow(emp, weekday, dISO, dopen, dclose, ctx);
        const [ws, we] = window;
        const maxday = (emp.max_hours_day || 10) * 60;
        const key = emp.id + ":" + dISO;
        const already = (busy[key] || []).reduce((s, [a, b]) => s + (b - a), 0);
        const shiftStart = Math.max(gapStart, ws);
        let shiftEnd = shiftStart;
        let j = gapI;
        while (
          j < steps.length && need[j] > covered[j] && steps[j] + step <= we &&
          (steps[j] + step - shiftStart) + already <= maxday &&
          isFree(busy[key] || [], shiftStart, steps[j] + step)
        ) {
          shiftEnd = steps[j] + step;
          j++;
        }
        if (shiftEnd <= shiftStart) shiftEnd = Math.min(shiftStart + step, we);
        assign(emp, dISO, shiftStart, shiftEnd, "dienst");
        steps.forEach((s, i) => { if (shiftStart <= s && s < shiftEnd) covered[i]++; });
      }

      checkDayWarnings(dISO, steps, step, busy, byIdMap, dclose, rules, warnings);
    }

    /* ---- 3) ins Dokument schreiben (nur nicht-fixierte ersetzen) ------ */
    if (mode === "replan") {
      doc.assignments = doc.assignments.filter(
        (a) => !(a.location_id === locationId && a.iso_year === year && a.iso_week === week && !a.locked)
      );
      for (const rec of created) DP.model.insert(doc, "assignments", rec);
    }

    const hours = {};
    let total = 0;
    for (const [idStr, m] of Object.entries(minutes)) {
      const e = byIdMap[+idStr];
      if (e) hours[e.kuerzel] = Math.round((m / 60) * 10) / 10;
      total += m;
    }
    warnings.sort((a, b) => (a.date + a.type).localeCompare(b.date + b.type));
    return {
      location_id: locationId, year, week,
      created: created.length, warnings, hours,
      total_hours: Math.round((total / 60) * 10) / 10,
    };
  }

  function ranges(sortedSteps, step) {
    const out = [];
    for (const s of sortedSteps) {
      if (out.length && out[out.length - 1][1] === s) out[out.length - 1][1] = s + step;
      else out.push([s, s + step]);
    }
    return out;
  }

  function checkDayWarnings(dISO, steps, step, busy, byIdMap, dclose, rules, warnings) {
    const presentAt = (s) => {
      const ids = [];
      for (const [key, ivs] of Object.entries(busy)) {
        const sep = key.indexOf(":");
        if (key.slice(sep + 1) !== dISO) continue;
        const empId = +key.slice(0, sep);
        for (const [bs, be] of ivs) if (bs <= s && s < be) { ids.push(empId); break; }
      }
      return [...new Set(ids)];
    };

    const azubiAlone = [];
    for (const s of steps) {
      const present = presentAt(s);
      if (!present.length) continue;
      if (!present.some((p) => (byIdMap[p] || {}).can_work_alone)) azubiAlone.push(s);
    }
    if ((rules.azubi_not_alone || "enforce") !== "off") {
      for (const [rs, re] of ranges(azubiAlone, step))
        warnings.push({
          type: "azubi_allein", date: dISO, severity: "warn",
          message: `${toHHMM(rs)}-${toHHMM(re)}: Azubi ohne erlaubte Begleitung`,
        });
    }

    const last = dclose - step;
    const presentEnd = presentAt(last);
    if (presentEnd.length && (rules.closer_present || "warn") !== "off") {
      if (!presentEnd.some((p) => (byIdMap[p] || {}).can_open_close))
        warnings.push({
          type: "kein_schliesser", date: dISO, severity: "warn",
          message: `ab ${toHHMM(last)}: niemand mit Schliessberechtigung`,
        });
    }
  }

  DP.planner = { generate, loadContext, toMin, toHHMM, isoWeekOf, dateFromISOWeek, weekdayOfISO };
})();
