/* Mobile-UI des Dienstplaners. Rendert alles in #app.
   Tabs: Plan / Setup / Mails / Team / Export. Bearbeitung ueber Bottom-Sheets. */
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  if (typeof document === "undefined") return; // Node-Tests

  /* ------------------------------ Helfer ------------------------------ */
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const toMin = DP.planner.toMin, toHHMM = DP.planner.toHHMM;
  const WD = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const WDS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const PALETTE = ["#2E7D5B", "#3B6FB0", "#C99A2E", "#7A5AA6", "#2E8B7F", "#B5654B", "#4A6FA5", "#8E44AD", "#16A085", "#2F5D8A"];

  const IC = {
    cal: '<rect x="3.5" y="4.5" width="17" height="16" rx="2"/><line x1="3.5" y1="9" x2="20.5" y2="9"/><line x1="8" y1="2.5" x2="8" y2="6"/><line x1="16" y1="2.5" x2="16" y2="6"/>',
    slid: '<line x1="4" y1="7" x2="20" y2="7"/><circle cx="9" cy="7" r="2.1"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="15" cy="17" r="2.1"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    team: '<circle cx="9" cy="8" r="3.1"/><path d="M3.6 20a5.4 5.4 0 0 1 10.8 0"/><path d="M16 5.3a3.1 3.1 0 0 1 0 5.6"/><path d="M17.5 14.3A5.4 5.4 0 0 1 20.4 19"/>',
    out: '<path d="M12 3v11"/><path d="M8 11l4 4 4-4"/><path d="M4.5 20h15"/>',
    chevL: '<path d="M15 5l-7 7 7 7"/>', chevR: '<path d="M9 5l7 7-7 7"/>',
    wand: '<circle cx="12" cy="12" r="2.6"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7"/>',
    alert: '<path d="M12 3.5 2.8 20h18.4L12 3.5Z"/><line x1="12" y1="10" x2="12" y2="14.4"/>',
    sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M19.2 4.8l-1.6 1.6M6.4 17.6l-1.6 1.6"/>',
    moon: '<path d="M20 14.4A8 8 0 1 1 9.6 4 6.5 6.5 0 0 0 20 14.4Z"/>',
    anchor: '<circle cx="12" cy="5" r="2.3"/><line x1="12" y1="7.3" x2="12" y2="21"/><path d="M5 12a7 7 0 0 0 14 0"/><line x1="3.4" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="20.6" y2="12"/>',
    inbox: '<path d="M4 13h4l1.5 2.5h5L16 13h4"/><path d="M4 13 6.4 5.6A2 2 0 0 1 8.3 4.2h7.4a2 2 0 0 1 1.9 1.4L20 13v4.8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ""}</svg>`;

  function hexText(hex) {
    const h = (hex || "#888").replace("#", "");
    const v = (i) => { const c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return (0.2126 * v(0) + 0.7152 * v(2) + 0.0722 * v(4)) > 0.5 ? "#12212f" : "#f2f6fb";
  }
  const catalog = (name) => { const m = {}; (S.doc.settings[name] || []).forEach((x) => x && x.id && (m[x.id] = x)); return m; };

  function mondayOf(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; }
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => new Date(s + "T00:00:00");
  const wk = () => DP.planner.isoWeekOf(S.monday);
  function weekDates() { const out = []; for (let i = 0; i < 7; i++) { const d = new Date(S.monday); d.setDate(d.getDate() + i); out.push(isoOf(d)); } return out; }

  /* ------------------------------ Zustand ----------------------------- */
  const S = {
    doc: null, tab: "plan", locId: null, monday: mondayOf(new Date()), day: 0,
    lastPlan: null, avail: { weeks: [], parsed: [] },
  };
  const loc = () => S.doc.locations.find((l) => l.id === S.locId);
  const locEmps = () => S.doc.employees.filter((e) => e.location_id === S.locId && e.active !== 0);
  const empById = (id) => S.doc.employees.find((e) => e.id === id);
  const inWeek = (r) => { const { year, week } = wk(); return r.location_id === S.locId && r.iso_year === year && r.iso_week === week; };

  /* ------------------------------ Toast ------------------------------- */
  function toast(msg, k = "info") {
    let wrap = $("#toasts");
    if (!wrap) { // UI evtl. noch nicht gebaut -> eigenen Container anlegen
      wrap = document.createElement("div");
      wrap.className = "toasts"; wrap.id = "toasts";
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = "toast"; el.dataset.k = k;
    el.innerHTML = `<i></i><span>${esc(msg)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  /* ------------------------------ Dateien ----------------------------- */
  const DL_EXT = ["json", "txt", "md", "png", "jpg", "jpeg", "webp", "gif", "mp4", "webm"];
  async function saveFile(filename, data, mime) {
    // claude.downloads nur fuer erlaubte Endungen; sonst Blob-Download
    const ext = (filename.split(".").pop() || "").toLowerCase();
    const cd = globalThis.claude && globalThis.claude.downloads;
    if (cd && cd.save && DL_EXT.includes(ext)) {
      try { await cd.save({ filename, data }); toast("Datei gespeichert: " + filename, "success"); return; }
      catch (e) { if (e && e.code === "declined") { toast("Speichern abgebrochen", "info"); return; } }
    }
    const blob = data instanceof Uint8Array ? new Blob([data], { type: mime }) : new Blob([data], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Heruntergeladen: " + filename, "success");
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); toast("Kopiert ✓", "success"); return true; }
    catch (e) { return false; }
  }
  /** Text-Anzeige-Sheet mit Kopier-Fallback (Zwischenablage geht nur ueber https). */
  function showTextSheet(title, explain, text) {
    const body = `${explain ? `<p class="muted">${explain}</p>` : ""}
      <textarea class="ctl" id="ts-text" readonly style="min-height:220px">${esc(text)}</textarea>`;
    const foot = `<button class="btn btn--pri" data-copy>${icon("copy")} Kopieren</button>
      <span class="sp"></span><button class="btn" data-x>Schließen</button>`;
    const { dlg } = sheet({ title, body, foot });
    const ta = dlg.querySelector("#ts-text");
    ta.addEventListener("focus", () => ta.select());
    dlg.querySelector("[data-copy]").addEventListener("click", async () => {
      if (!(await copyText(text))) { ta.focus(); ta.select(); toast("Bitte markierten Text manuell kopieren (Gedrückt halten → Kopieren)", "info"); }
    });
  }

  /* ------------------------------ Sheet ------------------------------- */
  function sheet({ title, body, foot }) {
    const dlg = document.createElement("dialog");
    dlg.className = "sheet";
    dlg.innerHTML = `<div class="sheet__box"><div class="sheet__grip"></div>
      <div class="sheet__head"><div class="ti">${esc(title)}</div>
        <button class="btn btn--icon btn--ghost" data-x>✕</button></div>
      <div class="sheet__body">${body}</div>
      <div class="sheet__foot">${foot}</div></div>`;
    document.body.appendChild(dlg);
    const close = () => { try { dlg.close(); } catch (e) {} dlg.remove(); };
    dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-x]")) close(); });
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    dlg.showModal();
    return { dlg, close };
  }
  const segWire = (dlg, sel) => dlg.querySelector(sel).addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    dlg.querySelectorAll(sel + " button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
  });
  const segVal = (dlg, sel) => dlg.querySelector(sel + " .on").dataset.v;

  /* ============================== RENDER =============================== */
  function render() {
    const l = loc();
    const tabs = [
      ["plan", "cal", "Plan"], ["setup", "slid", "Setup"], ["mails", "inbox", "Mails"],
      ["team", "team", "Team"], ["export", "out", "Export"],
    ];
    $("#app").innerHTML = `
      <header class="hdr">
        <button class="btn btn--icon btn--ghost" data-a="loc" title="Standort wechseln">${icon("anchor")}</button>
        <div class="hdr__title"><i class="dot" style="background:${esc(l.color)}"></i><span>${esc(l.name)}</span></div>
        <div class="hdr__spacer"></div>
        <button class="btn btn--icon btn--ghost" data-a="theme">${icon(document.documentElement.dataset.theme === "light" ? "moon" : "sun")}</button>
      </header>
      <div class="screen" id="screen"></div>
      <nav class="tabs">${tabs.map(([id, ic, lb]) =>
        `<button class="${S.tab === id ? "on" : ""}" data-tab="${id}">${icon(ic)}<span>${lb}</span></button>`).join("")}</nav>
      <div class="toasts" id="toasts"></div>`;

    $(".hdr").onclick = (e) => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      if (b.dataset.a === "theme") {
        const cur = document.documentElement.dataset.theme || "dark";
        document.documentElement.dataset.theme = cur === "light" ? "dark" : "light";
        try { localStorage.setItem("dp-theme", document.documentElement.dataset.theme); } catch (err) {}
        render();
      } else if (b.dataset.a === "loc") pickLocation();
    };
    $(".tabs").onclick = (e) => {
      const b = e.target.closest("[data-tab]"); if (!b) return;
      S.tab = b.dataset.tab; render();
    };

    const scr = $("#screen");
    if (S.tab === "plan") renderPlan(scr);
    else if (S.tab === "setup") renderSetup(scr);
    else if (S.tab === "mails") renderMails(scr);
    else if (S.tab === "team") renderTeam(scr);
    else renderExport(scr);
  }

  function pickLocation() {
    const body = `<div class="list">${S.doc.locations.map((l) => `
      <button class="item" data-loc="${l.id}"><span class="bar" style="--c:${esc(l.color)}"></span>
        <span class="bd"><span class="ti">${esc(l.name)}</span>
        <span class="mt">${S.doc.employees.filter((e) => e.location_id === l.id && e.active !== 0).length} Mitarbeiter</span></span>
        ${l.id === S.locId ? '<span class="tag" style="--c:var(--accent)">aktiv</span>' : ""}</button>`).join("")}</div>`;
    const { dlg, close } = sheet({ title: "Standort", body, foot: '<button class="btn btn--block" data-x>Schließen</button>' });
    dlg.addEventListener("click", (e) => {
      const b = e.target.closest("[data-loc]"); if (!b) return;
      S.locId = +b.dataset.loc; close(); render();
    });
  }

  /* ------------------------------ PLAN --------------------------------- */
  function renderPlan(scr) {
    const { year, week } = wk();
    const dates = weekDates();
    const today = isoOf(new Date());
    const l = loc();
    const hol = DP.holidays.holidaysFor(year, l.bundesland);
    const hol2 = DP.holidays.holidaysFor(year + 1, l.bundesland);
    const holOf = (iso2) => hol[iso2] || hol2[iso2];
    const assigns = S.doc.assignments.filter(inWeek);
    const warnCount = S.lastPlan && S.lastPlan.week === week && S.lastPlan.year === year ? S.lastPlan.warnings.length : null;

    // Stunden je Person
    const mins = {};
    locEmps().forEach((e) => (mins[e.id] = 0));
    assigns.forEach((a) => { if (mins[a.employee_id] != null && a.kind !== "event") mins[a.employee_id] += toMin(a.end_time) - toMin(a.start_time); });

    const d0 = parseISO(dates[0]), d6 = parseISO(dates[6]);
    scr.innerHTML = `
      <div style="display:flex;flex-direction:column;min-height:100%">
        <div class="planbar">
          <button class="btn btn--icon btn--ghost" data-a="prev">${icon("chevL")}</button>
          <div style="flex:1;text-align:center"><div class="kw">KW ${week}</div>
            <div class="rng">${d0.getDate()}. ${MON[d0.getMonth()]} – ${d6.getDate()}. ${MON[d6.getMonth()]} ${d6.getFullYear()}</div></div>
          <button class="btn btn--icon btn--ghost" data-a="next">${icon("chevR")}</button>
          ${warnCount === null ? "" : `<button class="badge ${warnCount ? "" : "ok"}" data-a="warn">${warnCount || "✓"}</button>`}
        </div>
        <div class="weekstrip">${dates.map((iso2, i) => {
          const d = parseISO(iso2);
          const n = assigns.filter((a) => a.date === iso2).length;
          return `<button class="wchip ${iso2 === today ? "today" : ""} ${holOf(iso2) ? "hol" : ""}" data-day="${i}">
            <small>${WDS[i]}</small><b>${d.getDate()}</b>
            <span class="load">${"<i></i>".repeat(Math.min(3, n))}</span></button>`;
        }).join("")}</div>
        <div class="allday" id="allday"></div>
        <div style="flex:1;overflow:auto" id="calwrap"></div>
        <div class="hours">${locEmps().map((e) => {
          const h = Math.round((mins[e.id] / 60) * 10) / 10;
          return `<span class="hchip"><i style="background:${esc(e.color)}"></i><b>${esc(e.kuerzel)}</b>
            <span class="mono">${h}${e.weekly_hours ? "/" + e.weekly_hours : ""} h</span></span>`;
        }).join("")}</div>
        <div class="fab-row">
          <button class="btn" data-a="today">Heute</button>
          <button class="btn btn--pri" data-a="plan">${icon("wand")} Auto-Plan</button>
        </div>
      </div>`;

    renderAllday(dates);
    renderGrid(dates, holOf, assigns, today);
    // Beim Start zur heutigen Spalte wischen (nur wenn horizontal scrollbar)
    if (dates.includes(today)) scrollToDay(dates.indexOf(today), false);

    scr.onclick = async (e) => {
      const dayBtn = e.target.closest("[data-day]");
      if (dayBtn) { scrollToDay(+dayBtn.dataset.day, true); return; }
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a;
      if (a === "prev") { S.monday.setDate(S.monday.getDate() - 7); renderPlan(scr); }
      else if (a === "next") { S.monday.setDate(S.monday.getDate() + 7); renderPlan(scr); }
      else if (a === "today") { S.monday = mondayOf(new Date()); renderPlan(scr); }
      else if (a === "warn") showWarnings();
      else if (a === "plan") {
        b.disabled = true;
        const res = DP.planner.generate(S.doc, S.locId, year, week);
        S.lastPlan = res; DP.storage.markDirty();
        renderPlan(scr);
        toast(`Plan erstellt · ${res.created} Schichten${res.warnings.length ? ` · ${res.warnings.length} Warnung(en)` : " · keine Konflikte"}`, res.warnings.length ? "info" : "success");
      }
    };
  }

  function renderAllday(dates) {
    const cat = catalog("absence_types");
    const el = $("#allday");
    const chips = [];
    for (const a of S.doc.absences) {
      const emp = empById(a.employee_id);
      if (!emp || emp.location_id !== S.locId) continue;
      const { year, week } = wk();
      if (a.iso_year !== year || a.iso_week !== week) continue;
      const t = cat[a.type] || { label: a.type, color: "#8894a2" };
      let when = "";
      if (a.date) {
        const i0 = dates.indexOf(a.date);
        if (a.end_date) { const i1 = dates.indexOf(a.end_date); when = ` (${WDS[Math.max(0, i0)]}–${WDS[i1 >= 0 ? i1 : 6]})`; }
        else if (i0 >= 0) when = ` (${WDS[i0]})`;
      }
      chips.push(`<span class="schip" style="--c:${esc(t.color)}"><i></i>${esc(emp.kuerzel)} · ${esc(t.label)}${when}</span>`);
    }
    el.innerHTML = chips.join("");
  }

  function scrollToDay(i, smooth) {
    const wrap = $("#calwrap");
    if (!wrap || wrap.scrollWidth <= wrap.clientWidth + 4) return; // alles sichtbar
    const cols = wrap.querySelectorAll(".dcol");
    if (!cols[i]) return;
    const axisW = wrap.querySelector(".axis") ? wrap.querySelector(".axis").offsetWidth : 48;
    wrap.scrollTo({ left: Math.max(0, cols[i].offsetLeft - axisW), behavior: smooth ? "smooth" : "auto" });
  }

  function renderGrid(dates, holOf, assigns, today) {
    const view = S.doc.settings.view || {};
    const sH = view.start_hour || 7, eH = view.end_hour || 20;
    const pxH = 56;
    const gridH = (eH - sH) * pxH;
    const show = dates;
    const op = {};
    S.doc.operating_hours.filter((o) => o.location_id === S.locId).forEach((o) => (op[o.weekday] = o));
    const special = {};
    S.doc.special_days.filter((s) => s.location_id === S.locId).forEach((s) => (special[s.date] = s));

    let axis = `<div class="axis" style="height:${gridH}px">`;
    for (let h = sH; h <= eH; h++) axis += `<div class="tick" style="top:${(h - sH) * pxH}px">${pad(h)}</div>`;
    axis += "</div>";

    let heads = "", cols = "";
    show.forEach((iso2) => {
      const wd = DP.planner.weekdayOfISO(iso2);
      const d = parseISO(iso2);
      const hol = holOf(iso2);
      heads += `<div class="dhead ${iso2 === today ? "today" : ""}">${WDS[wd]} ${d.getDate()}.${d.getMonth() + 1}.${hol ? `<small>${esc(hol)}</small>` : ""}</div>`;
      const sp = special[iso2], oh = op[wd];
      const closed = sp ? sp.closed : oh ? oh.closed : 0;
      const openMin = closed ? null : toMin((sp && sp.open_time) || (oh && oh.open_time) || "08:00");
      const closeMin = closed ? null : toMin((sp && sp.close_time) || (oh && oh.close_time) || "18:00");

      let blocks = "";
      if (!closed) {
        if (openMin > sH * 60) blocks += `<div class="edge" style="top:0;height:${((openMin - sH * 60) / 60) * pxH}px"></div>`;
        if (closeMin < eH * 60) blocks += `<div class="edge" style="top:${((closeMin - sH * 60) / 60) * pxH}px;bottom:0"></div>`;
      }
      const evs = assigns.filter((a) => a.date === iso2).map((a) => ({ a, s: toMin(a.start_time), e: toMin(a.end_time) }));
      packEvents(evs).forEach((ev) => {
        const emp = empById(ev.a.employee_id) || {};
        const top = ((ev.s - sH * 60) / 60) * pxH, hpx = Math.max(22, ((ev.e - ev.s) / 60) * pxH);
        let label = "";
        if (ev.a.kind === "kurs") { const c = S.doc.courses.find((x) => x.id === ev.a.course_id); label = (c && c.title) || "Kurs"; }
        else if (ev.a.kind === "zbv") label = ev.a.task_text || "Aufgabe";
        else if (ev.a.kind === "telefon") label = "Telefon" + (ev.a.work_mode === "home" ? " · Zuhause" : "");
        blocks += `<div class="shift ${ev.a.work_mode === "home" ? "home" : ""} ${ev.a.locked ? "locked" : ""}"
          data-kind="${ev.a.kind}" data-id="${ev.a.id}"
          style="top:${top}px;height:${hpx}px;left:calc(${ev.left * 100}% + 3px);width:calc(${ev.width * 100}% - 6px);background:${esc(emp.color)};color:${hexText(emp.color)}">
          <b>${esc(emp.kuerzel || "?")} <span class="t">${ev.a.start_time}–${ev.a.end_time}</span></b>
          ${label && hpx > 40 ? `<span class="l">${esc(label)}</span>` : ""}</div>`;
      });
      let now = "";
      if (iso2 === today) {
        const n = new Date(); const nm = n.getHours() * 60 + n.getMinutes();
        if (nm >= sH * 60 && nm <= eH * 60) now = `<div class="nowline" style="top:${((nm - sH * 60) / 60) * pxH}px"></div>`;
      }
      cols += `<div class="dcol ${iso2 === today ? "today" : ""} ${closed ? "closed" : ""}" style="height:${gridH}px" data-date="${iso2}">${blocks}${now}</div>`;
    });

    $("#calwrap").innerHTML =
      `<div class="cal cal--week"><div class="corner"></div>${heads}${axis}${cols}</div>`;

    $("#calwrap").onclick = (e) => {
      const sEl = e.target.closest(".shift");
      if (sEl) {
        const a = S.doc.assignments.find((x) => x.id === +sEl.dataset.id);
        if (a) shiftSheet(a);
        return;
      }
      const col = e.target.closest(".dcol");
      if (col) {
        const rect = col.getBoundingClientRect();
        const min = sH * 60 + ((e.clientY - rect.top) / pxH) * 60;
        const snap = Math.max(sH * 60, Math.min(eH * 60 - 60, Math.round(min / 15) * 15));
        shiftSheet({ date: col.dataset.date, start_time: toHHMM(snap), end_time: toHHMM(snap + 60) });
      }
    };
  }

  function packEvents(evs) {
    evs.sort((a, b) => a.s - b.s || a.e - b.e);
    let group = [], groupEnd = -1;
    const flush = () => {
      const ends = [];
      group.forEach((ev) => {
        let placed = false;
        for (let i = 0; i < ends.length; i++) if (ends[i] <= ev.s) { ends[i] = ev.e; ev.col = i; placed = true; break; }
        if (!placed) { ev.col = ends.length; ends.push(ev.e); }
      });
      group.forEach((ev) => { ev.left = ev.col / ends.length; ev.width = 1 / ends.length; });
      group = []; groupEnd = -1;
    };
    evs.forEach((ev) => {
      if (group.length && ev.s >= groupEnd) flush();
      group.push(ev); groupEnd = Math.max(groupEnd, ev.e);
    });
    if (group.length) flush();
    return evs;
  }

  function showWarnings() {
    const w = (S.lastPlan && S.lastPlan.warnings) || [];
    const body = w.length ? `<div class="list">${w.map((x) => {
      const d = parseISO(x.date);
      return `<div class="warnitem" data-sev="${x.severity}"><i></i><div>
        <div class="d">${WDS[(d.getDay() + 6) % 7]} ${d.getDate()}.${d.getMonth() + 1}.</div>
        <div>${esc(x.message)}</div></div></div>`;
    }).join("")}</div>` : `<p class="muted">Keine Konflikte in dieser Woche.</p>`;
    sheet({ title: `Warnungen (${w.length})`, body, foot: '<button class="btn btn--block" data-x>Schließen</button>' });
  }

  /* --------------------------- Schicht-Sheet --------------------------- */
  function shiftSheet(a) {
    const isNew = !a.id;
    const emps = locEmps();
    const rooms = S.doc.rooms.filter((r) => r.location_id === S.locId);
    const kinds = S.doc.settings.shift_kinds || [];
    const dates = weekDates();
    const empId = a.employee_id || (emps[0] && emps[0].id);

    const body = `
      <div class="field"><label>Mitarbeiter</label><select class="ctl" id="s-emp">
        ${emps.map((e) => `<option value="${e.id}" ${e.id === empId ? "selected" : ""}>${esc(e.kuerzel)} · ${esc(e.name)}</option>`).join("")}</select></div>
      <div class="frow">
        <div class="field"><label>Art</label><select class="ctl" id="s-kind">
          ${kinds.map((k) => `<option value="${k.id}" ${k.id === (a.kind || "dienst") ? "selected" : ""}>${esc(k.label)}</option>`).join("")}</select></div>
        <div class="field"><label>Datum</label><input type="date" class="ctl" id="s-date" value="${esc(a.date)}" min="${dates[0]}" max="${dates[6]}"></div>
      </div>
      <div class="frow">
        <div class="field"><label>Von</label><input type="time" class="ctl" id="s-start" value="${esc(a.start_time || "08:00")}" step="900"></div>
        <div class="field"><label>Bis</label><input type="time" class="ctl" id="s-end" value="${esc(a.end_time || "16:00")}" step="900"></div>
      </div>
      <div class="field"><label>Arbeitsort</label><div class="seg" id="s-mode">
        <button type="button" data-v="onsite" class="${(a.work_mode || "onsite") === "onsite" ? "on" : ""}">Vor Ort</button>
        <button type="button" data-v="home" class="${a.work_mode === "home" ? "on" : ""}">Homeoffice</button></div></div>
      <div class="frow">
        <div class="field"><label>Raum</label><select class="ctl" id="s-room"><option value="">—</option>
          ${rooms.map((r) => `<option value="${r.id}" ${r.id === a.room_id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Aufgabe</label><input class="ctl" id="s-task" value="${esc(a.task_text || "")}" placeholder="z.B. umbauen Raum 2+3"></div>
      </div>
      <label class="check"><input type="checkbox" id="s-lock" ${a.id ? (a.locked ? "checked" : "") : "checked"}> Fixieren (Auto-Plan lässt die Schicht stehen)</label>`;
    const foot = `${isNew ? "" : '<button class="btn btn--danger" data-del>Löschen</button>'}
      <span class="sp"></span><button class="btn" data-x>Abbrechen</button>
      <button class="btn btn--pri" data-save>Speichern</button>`;
    const { dlg, close } = sheet({ title: isNew ? "Neue Schicht" : "Schicht bearbeiten", body, foot });
    segWire(dlg, "#s-mode");

    dlg.querySelector("[data-save]").addEventListener("click", () => {
      const g = (id) => dlg.querySelector(id);
      const date = g("#s-date").value, st = g("#s-start").value, en = g("#s-end").value;
      if (!date || !st || !en) return toast("Datum und Zeiten angeben", "error");
      if (en <= st) return toast("Ende muss nach Beginn liegen", "error");
      const iso2 = DP.planner.isoWeekOf(parseISO(date));
      const data = {
        location_id: S.locId, iso_year: iso2.year, iso_week: iso2.week,
        employee_id: +g("#s-emp").value, date, start_time: st, end_time: en,
        kind: g("#s-kind").value, work_mode: segVal(dlg, "#s-mode"),
        room_id: g("#s-room").value ? +g("#s-room").value : null,
        task_text: g("#s-task").value.trim() || null,
        course_id: a.course_id || null, status_type: a.status_type || null,
        locked: g("#s-lock").checked ? 1 : 0, auto_generated: 0,
      };
      if (isNew) DP.model.insert(S.doc, "assignments", data);
      else DP.model.update(S.doc, "assignments", a.id, data);
      DP.storage.markDirty(); close(); render(); toast("Schicht gespeichert", "success");
    });
    const del = dlg.querySelector("[data-del]");
    if (del) del.addEventListener("click", () => {
      DP.model.remove(S.doc, "assignments", a.id);
      DP.storage.markDirty(); close(); render(); toast("Schicht gelöscht", "success");
    });
  }

  /* ------------------------------ SETUP -------------------------------- */
  function renderSetup(scr) {
    const { week } = wk();
    const absCat = catalog("absence_types"), ctCat = catalog("course_types");
    const roomName = (id) => { const r = S.doc.rooms.find((x) => x.id === id); return r ? r.name : ""; };
    const fmtD = (iso2) => { const d = parseISO(iso2); return `${WDS[(d.getDay() + 6) % 7]} ${d.getDate()}.${d.getMonth() + 1}.`; };
    const { year } = wk();
    const inW = (r) => r.iso_year === year && r.iso_week === week;

    const absRows = S.doc.absences.filter((a) => { const e = empById(a.employee_id); return e && e.location_id === S.locId && inW(a); })
      .map((a) => {
        const e = empById(a.employee_id); const t = absCat[a.type] || { label: a.type, color: "#8894a2" };
        const when = a.date ? (a.end_date ? `${fmtD(a.date)}–${fmtD(a.end_date)}` : fmtD(a.date)) : "ganze Woche";
        return `<button class="item" data-e="abs:${a.id}" style="--c:${esc(t.color)}"><span class="bar"></span>
          <span class="bd"><span class="ti">${esc(e.kuerzel)} — ${esc(e.name)}</span>
          <span class="mt">${when}${a.period && a.period !== "ganztags" ? " · " + a.period : ""}${a.priority === "wunsch" ? " · Wunsch" : ""}</span></span>
          <span class="tag">${esc(t.label)}</span></button>`;
      }).join("") || '<div class="empty">Keine Abwesenheiten diese Woche.</div>';

    const courseRows = S.doc.courses.filter((c) => c.location_id === S.locId && inW(c)).map((c) => {
      const t = ctCat[c.type] || { label: c.type, color: "#8894a2" };
      const staff = c.staff_needed ? `${c.staff_needed} Pers.${c.role_required ? " (" + c.role_required + ")" : ""}` : "ohne Personal";
      const when = c.end_date && c.end_date > c.date ? `${fmtD(c.date)}–${fmtD(c.end_date)}` : fmtD(c.date);
      return `<button class="item" data-e="course:${c.id}" style="--c:${esc(t.color)}"><span class="bar"></span>
        <span class="bd"><span class="ti">${esc(c.title || "Kurs")}</span>
        <span class="mt">${when} ${c.start_time}–${c.end_time}${c.room_id ? " · " + esc(roomName(c.room_id)) : ""} · ${staff}</span></span>
        <span class="tag">${esc(t.label)}</span></button>`;
    }).join("") || '<div class="empty">Keine Kurse diese Woche.</div>';

    const taskRows = S.doc.tasks.filter((t) => t.location_id === S.locId && inW(t)).map((t) =>
      `<button class="item" data-e="task:${t.id}" style="--c:#C99A2E"><span class="bar"></span>
        <span class="bd"><span class="ti">${esc(t.title || "Aufgabe")}</span>
        <span class="mt">${fmtD(t.date)} ${t.start_time}–${t.end_time}${t.room_id ? " · " + esc(roomName(t.room_id)) : ""} · ${t.staff_needed || 1} Pers.</span></span>
        <span class="tag">zbV</span></button>`).join("") || '<div class="empty">Keine Sonderaufgaben diese Woche.</div>';

    scr.innerHTML = `<div class="page">
      <div><h1>Wochen-Setup · KW ${week}</h1>
      <p class="muted">Alles, was diese Woche vom Normalfall abweicht — der Auto-Plan berücksichtigt es automatisch.</p></div>
      <section><div class="rowhead"><h2>Abwesenheiten & Wünsche</h2><span class="sp"></span>
        <button class="btn btn--sm" data-add="abs">+ Neu</button></div><div class="list">${absRows}</div></section>
      <section><div class="rowhead"><h2>Kurse</h2><span class="sp"></span>
        <button class="btn btn--sm" data-add="course">+ Neu</button></div><div class="list">${courseRows}</div></section>
      <section><div class="rowhead"><h2>Sonderaufgaben (zbV)</h2><span class="sp"></span>
        <button class="btn btn--sm" data-add="task">+ Neu</button></div><div class="list">${taskRows}</div></section>
    </div>`;

    scr.onclick = (e) => {
      const add = e.target.closest("[data-add]"), ed = e.target.closest("[data-e]");
      if (add) {
        if (add.dataset.add === "abs") absenceSheet(null);
        else if (add.dataset.add === "course") courseSheet(null);
        else taskSheet(null);
      } else if (ed) {
        const [k, id] = ed.dataset.e.split(":");
        if (k === "abs") absenceSheet(S.doc.absences.find((x) => x.id === +id));
        else if (k === "course") courseSheet(S.doc.courses.find((x) => x.id === +id));
        else taskSheet(S.doc.tasks.find((x) => x.id === +id));
      }
    };
  }

  function crudSheet({ title, isNew, body, table, rec, buildData, afterWire }) {
    const foot = `${isNew ? "" : '<button class="btn btn--danger" data-del>Löschen</button>'}
      <span class="sp"></span><button class="btn" data-x>Abbrechen</button>
      <button class="btn btn--pri" data-save>Speichern</button>`;
    const { dlg, close } = sheet({ title, body, foot });
    if (afterWire) afterWire(dlg);
    dlg.querySelector("[data-save]").addEventListener("click", () => {
      const data = buildData(dlg);
      if (!data) return;
      if (isNew) DP.model.insert(S.doc, table, data);
      else DP.model.update(S.doc, table, rec.id, data);
      DP.storage.markDirty(); close(); render(); toast("Gespeichert", "success");
    });
    const del = dlg.querySelector("[data-del]");
    if (del) del.addEventListener("click", () => {
      DP.model.remove(S.doc, table, rec.id);
      DP.storage.markDirty(); close(); render(); toast("Gelöscht", "success");
    });
  }

  function absenceSheet(a) {
    const isNew = !a;
    const emps = locEmps(), types = S.doc.settings.absence_types || [], dates = weekDates();
    a = a || { employee_id: emps[0] && emps[0].id, type: types[0] && types[0].id, period: "ganztags", priority: "fix", date: null };
    const body = `
      <div class="field"><label>Mitarbeiter</label><select class="ctl" id="a-emp">
        ${emps.map((e) => `<option value="${e.id}" ${e.id === a.employee_id ? "selected" : ""}>${esc(e.kuerzel)} · ${esc(e.name)}</option>`).join("")}</select></div>
      <div class="frow">
        <div class="field"><label>Art</label><select class="ctl" id="a-type">
          ${types.map((t) => `<option value="${t.id}" ${t.id === a.type ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></div>
        <div class="field"><label>Tageszeit</label><select class="ctl" id="a-period">
          ${[["ganztags", "Ganztags"], ["vm", "Vormittags"], ["nm", "Nachmittags"]].map(([v, l]) => `<option value="${v}" ${a.period === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      </div>
      <label class="check"><input type="checkbox" id="a-week" ${!a.date ? "checked" : ""}> Ganze Woche</label>
      <div class="frow">
        <div class="field"><label>Von</label><input type="date" class="ctl" id="a-date" value="${esc(a.date || dates[0])}" min="${dates[0]}" max="${dates[6]}"></div>
        <div class="field"><label>Bis (optional)</label><input type="date" class="ctl" id="a-end" value="${esc(a.end_date || "")}" min="${dates[0]}" max="${dates[6]}"></div>
      </div>
      <div class="field"><label>Priorität</label><div class="seg" id="a-prio">
        <button type="button" data-v="fix" class="${a.priority !== "wunsch" ? "on" : ""}">Fix</button>
        <button type="button" data-v="wunsch" class="${a.priority === "wunsch" ? "on" : ""}">Wunsch</button></div></div>`;
    crudSheet({
      title: isNew ? "Abwesenheit / Wunsch" : "Abwesenheit bearbeiten", isNew, body,
      table: "absences", rec: a,
      afterWire: (dlg) => segWire(dlg, "#a-prio"),
      buildData: (dlg) => {
        const g = (id) => dlg.querySelector(id);
        const { year, week } = wk();
        const whole = g("#a-week").checked;
        return {
          employee_id: +g("#a-emp").value, iso_year: year, iso_week: week,
          type: g("#a-type").value, period: g("#a-period").value, priority: segVal(dlg, "#a-prio"),
          date: whole ? null : g("#a-date").value, end_date: whole ? null : (g("#a-end").value || null),
          start_time: null, end_time: null, note: null,
        };
      },
    });
  }

  function courseSheet(c) {
    const isNew = !c;
    const types = S.doc.settings.course_types || [];
    const rooms = S.doc.rooms.filter((r) => r.location_id === S.locId);
    const roles = S.doc.settings.roles || [];
    const dates = weekDates();
    c = c || { type: types[0] && types[0].id, date: dates[0], start_time: "18:00", end_time: "20:00", staff_needed: 0 };
    const body = `
      <div class="frow">
        <div class="field"><label>Typ</label><select class="ctl" id="c-type">
          ${types.map((t) => `<option value="${t.id}" ${t.id === c.type ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></div>
        <div class="field"><label>Titel</label><input class="ctl" id="c-title" value="${esc(c.title || "")}" placeholder="z.B. Excel-Kurs"></div>
      </div>
      <div class="frow">
        <div class="field"><label>Erster Tag</label><input type="date" class="ctl" id="c-date" value="${esc(c.date)}" min="${dates[0]}" max="${dates[6]}"></div>
        <div class="field"><label>Letzter Tag (optional)</label><input type="date" class="ctl" id="c-enddate" value="${esc(c.end_date || "")}" min="${dates[0]}"></div>
      </div>
      <div class="frow">
        <div class="field"><label>Täglich von</label><input type="time" class="ctl" id="c-start" value="${esc(c.start_time)}" step="900"></div>
        <div class="field"><label>Täglich bis</label><input type="time" class="ctl" id="c-end" value="${esc(c.end_time)}" step="900"></div>
      </div>
      <div class="field"><label>Raum</label><select class="ctl" id="c-room"><option value="">—</option>
        ${rooms.map((r) => `<option value="${r.id}" ${r.id === c.room_id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></div>
      <div class="frow">
        <div class="field"><label>Personalbedarf</label><input type="number" class="ctl" id="c-staff" value="${c.staff_needed || 0}" min="0" max="10"></div>
        <div class="field"><label>Rolle</label><select class="ctl" id="c-role"><option value="">—</option>
          ${roles.map((r) => `<option ${r === c.role_required ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></div>
      </div>
      <p class="muted" style="font-size:13px">Präsenz deckt die Grundbesetzung ab (Bedarf 0). Hybrid/Online bekommen eigenes Personal (Bedarf ≥ 1).</p>`;
    crudSheet({
      title: isNew ? "Neuer Kurs" : "Kurs bearbeiten", isNew, body, table: "courses", rec: c,
      buildData: (dlg) => {
        const g = (id) => dlg.querySelector(id);
        const iso2 = DP.planner.isoWeekOf(parseISO(g("#c-date").value));
        const endD = g("#c-enddate").value || null;
        if (endD && endD < g("#c-date").value) { toast("Letzter Tag liegt vor dem ersten", "error"); return null; }
        return {
          location_id: S.locId, iso_year: iso2.year, iso_week: iso2.week, date: g("#c-date").value,
          end_date: endD,
          type: g("#c-type").value, title: g("#c-title").value.trim() || null,
          start_time: g("#c-start").value, end_time: g("#c-end").value,
          room_id: g("#c-room").value ? +g("#c-room").value : null,
          staff_needed: +g("#c-staff").value || 0, role_required: g("#c-role").value || null, note: null,
        };
      },
    });
  }

  function taskSheet(t) {
    const isNew = !t;
    const rooms = S.doc.rooms.filter((r) => r.location_id === S.locId);
    const roles = S.doc.settings.roles || [];
    const dates = weekDates();
    t = t || { date: dates[0], start_time: "14:00", end_time: "17:00", staff_needed: 1 };
    const body = `
      <div class="field"><label>Titel / Aufgabe</label><input class="ctl" id="t-title" value="${esc(t.title || "")}" placeholder="z.B. umbauen Raum 2+3"></div>
      <div class="frow">
        <div class="field"><label>Datum</label><input type="date" class="ctl" id="t-date" value="${esc(t.date)}" min="${dates[0]}" max="${dates[6]}"></div>
        <div class="field"><label>Raum</label><select class="ctl" id="t-room"><option value="">—</option>
          ${rooms.map((r) => `<option value="${r.id}" ${r.id === t.room_id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></div>
      </div>
      <div class="frow">
        <div class="field"><label>Von</label><input type="time" class="ctl" id="t-start" value="${esc(t.start_time)}" step="900"></div>
        <div class="field"><label>Bis</label><input type="time" class="ctl" id="t-end" value="${esc(t.end_time)}" step="900"></div>
      </div>
      <div class="frow">
        <div class="field"><label>Personen</label><input type="number" class="ctl" id="t-staff" value="${t.staff_needed || 1}" min="1" max="10"></div>
        <div class="field"><label>Rolle</label><select class="ctl" id="t-role"><option value="">—</option>
          ${roles.map((r) => `<option ${r === t.role_required ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></div>
      </div>`;
    crudSheet({
      title: isNew ? "Neue Sonderaufgabe" : "Sonderaufgabe bearbeiten", isNew, body, table: "tasks", rec: t,
      buildData: (dlg) => {
        const g = (id) => dlg.querySelector(id);
        const iso2 = DP.planner.isoWeekOf(parseISO(g("#t-date").value));
        return {
          location_id: S.locId, iso_year: iso2.year, iso_week: iso2.week, date: g("#t-date").value,
          title: g("#t-title").value.trim() || null,
          start_time: g("#t-start").value, end_time: g("#t-end").value,
          room_id: g("#t-room").value ? +g("#t-room").value : null,
          staff_needed: +g("#t-staff").value || 1, role_required: g("#t-role").value || null, note: null,
        };
      },
    });
  }

  /* ------------------------------ MAILS -------------------------------- */
  function availWeeks() {
    const start = $("#av-start") ? $("#av-start").value : null;
    const count = Math.max(1, Math.min(12, +($("#av-count") && $("#av-count").value) || 4));
    const monday = mondayOf(start ? parseISO(start) : new Date());
    const out = [];
    for (let i = 0; i < count; i++) {
      const m = new Date(monday); m.setDate(m.getDate() + i * 7);
      const su = new Date(m); su.setDate(su.getDate() + 6);
      const iso2 = DP.planner.isoWeekOf(m);
      out.push({ year: iso2.year, week: iso2.week, monday: m, sunday: su });
    }
    return out;
  }
  const fmtDMY = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  function periodLabel(weeks) {
    const a = weeks[0], b = weeks[weeks.length - 1];
    return `${weeks.length > 1 ? `KW ${a.week}–${b.week}` : `KW ${a.week}`}  (${fmtDMY(a.monday)}–${fmtDMY(b.sunday)})`;
  }
  function mailSubject(weeks) {
    const a = weeks[0], b = weeks[weeks.length - 1];
    return `${S.doc.settings.mail_subject || "Verfügbarkeit"} KW${a.week}${weeks.length > 1 ? "–" + b.week : ""}`;
  }
  function buildTemplate(weeks, name) {
    // Pro Woche ein eigener Block: Mi in KW 30 heisst nicht Mi in KW 33.
    const blocks = weeks.map((w) =>
      `--- KW ${w.week} (${fmtDMY(w.monday).slice(0, 6)}–${fmtDMY(w.sunday)}) ---
Mo:
Di:
Mi:
Do:
Fr:
Sa:
So:`).join("\n\n");
    return `════════ VERFÜGBARKEIT ════════
Betreff der Antwort-Mail: ${mailSubject(weeks)}
Name: ${name || ""}
Zeitraum: ${periodLabel(weeks)}

Je Tag EIN Wort: ganz / vormittags / nachmittags / nicht
Bitte JEDE Woche einzeln ausfüllen.

${blocks}
═══════════════════════════════`;
  }
  function normAvail(s) {
    s = (s || "").trim().toLowerCase();
    if (!s) return null;
    if (/ganz|^ja$|voll|immer|^x$|^1$/.test(s)) return "yes";
    if (/vorm|^vm$|^v$/.test(s)) return "vm";
    if (/nachm|^nm$|^n$/.test(s)) return "nm";
    if (/nicht|nein|kein|frei|^0$|^-$|^—$|gar/.test(s)) return "no";
    return null;
  }
  function matchEmployee(name) {
    const emps = S.doc.employees.filter((e) => e.active !== 0);
    const n = name.toLowerCase().replace(/\s+/g, " ").trim();
    let m = emps.find((e) => e.name.toLowerCase() === n)
      || emps.find((e) => (e.kuerzel || "").toLowerCase() === n)
      || emps.find((e) => e.name.toLowerCase().includes(n) || n.includes(e.name.toLowerCase()));
    if (!m) { const toks = n.split(" ").filter((t) => t.length > 2); m = emps.find((e) => toks.some((t) => e.name.toLowerCase().includes(t))); }
    return m || null;
  }
  const DAY_KEYS = [["mo", "montag"], ["di", "dienstag"], ["mi", "mittwoch"], ["do", "donnerstag"], ["fr", "freitag"], ["sa", "samstag"], ["so", "sonntag"]];

  function parseDayLines(section) {
    const weekdays = {}; const warnings = []; let filled = 0;
    DAY_KEYS.forEach(([ab, full], i) => {
      const re = new RegExp("^\\s*(?:" + ab + "|" + full + ")\\s*[:.=\\-]\\s*(.*)$", "im");
      const m = section.match(re);
      if (m) {
        const v = normAvail(m[1]);
        weekdays[i] = v;
        if (v !== null) filled++;
        if (m[1].trim() && v === null) warnings.push(`${WDS[i]}: "${m[1].trim()}" unklar`);
      } else weekdays[i] = undefined;
    });
    return { weekdays, warnings, filled };
  }

  /** Pro Person: perWeek[kwNummer] = {0..6: mode}. Ohne KW-Abschnitte:
      ein Muster fuer alle Wochen (mit Hinweis). */
  function parseResponses(text, weeks) {
    const blocks = text.split(/(?=^\s*name\s*:)/mi).map((b) => b.trim()).filter(Boolean);
    return blocks.map((block) => {
      const nameM = block.match(/name\s*:\s*(.+)/i);
      const rawName = nameM ? nameM[1].trim() : "";
      const warnings = [];
      const perWeek = {};
      let filled = 0;

      // Abschnitte "KW <nr> ..." finden
      const parts = block.split(/^[-–\s]*KW\s*(\d+)[^\n]*$/im);
      // parts: [vorspann, kw1, text1, kw2, text2, ...]
      if (parts.length > 1) {
        for (let i = 1; i + 1 < parts.length + 1; i += 2) {
          const kwNum = +parts[i];
          const sec = parts[i + 1] || "";
          const r = parseDayLines(sec);
          perWeek[kwNum] = r.weekdays;
          filled += r.filled;
          r.warnings.forEach((w) => warnings.push(`KW${kwNum} ${w}`));
          if (r.filled === 0) warnings.push(`KW${kwNum}: leer`);
        }
        for (const w of weeks) if (!perWeek[w.week]) warnings.push(`KW${w.week} fehlt in der Antwort`);
      } else {
        // Fallback: ein Muster fuer alle Wochen
        const r = parseDayLines(block);
        filled = r.filled;
        warnings.push(...r.warnings);
        if (r.filled > 0) {
          warnings.push("Ein Muster für alle Wochen übernommen");
          for (const w of weeks) perWeek[w.week] = r.weekdays;
        }
      }

      if (!rawName) warnings.push("Kein Name erkannt");
      const emp = rawName ? matchEmployee(rawName) : null;
      if (rawName && !emp) warnings.push("Nicht zugeordnet");
      return { rawName, emp, perWeek, warnings, filled };
    }).filter((p) => p.rawName || p.filled > 0);
  }
  const AV_LABEL = { yes: "ganz", no: "nicht", vm: "vm", nm: "nm" };

  function renderMails(scr) {
    const nm = mondayOf(new Date()); nm.setDate(nm.getDate() + 7);
    const canFetch = !!(globalThis.claude && globalThis.claude.mcp);
    scr.innerHTML = `<div class="page">
      <div><h1>Verfügbarkeit</h1>
      <p class="muted">Mitarbeiter füllen die feste Vorlage aus. Antworten hier abrufen oder einfügen — die App liest sie selbst.</p></div>
      <div class="card">
        <div class="frow">
          <div class="field"><label>Ab Montag</label><input type="date" class="ctl" id="av-start" value="${isoOf(nm)}"></div>
          <div class="field"><label>Wochen</label><input type="number" class="ctl" id="av-count" value="4" min="1" max="12"></div>
        </div>
        <div class="muted mono" id="av-label"></div>
      </div>
      <div class="card">
        <h2>1 · Vorlage verschicken</h2>
        <div class="rowhead" style="flex-wrap:wrap;gap:8px">
          <button class="btn btn--sm" data-a="gen">Vorlage erzeugen</button>
          <button class="btn btn--sm" data-a="genper">Pro Mitarbeiter</button>
          <button class="btn btn--sm btn--ghost" data-a="copytpl">${icon("copy")} Kopieren</button>
        </div>
        <textarea class="ctl" id="av-tpl" readonly placeholder="Hier erscheint die Vorlage …"></textarea>
      </div>
      <div class="card">
        <h2>2 · Antworten auswerten</h2>
        <button class="btn ${canFetch ? "btn--pri" : ""}" data-a="fetch" ${canFetch ? "" : "disabled"}>
          ${icon("inbox")} Mails automatisch abrufen</button>
        ${canFetch ? "" : '<p class="muted" style="font-size:13px">Automatischer Abruf ist aktiv, sobald die App als claude.ai-App mit Gmail-Zugriff läuft. Bis dahin: unten einfügen.</p>'}
        <textarea class="ctl" id="av-paste" placeholder="Antworten hier einfügen (auch mehrere) …"></textarea>
        <div class="rowhead"><button class="btn btn--pri" data-a="parse">Auswerten</button>
          <button class="btn btn--sm btn--ghost" data-a="prompt">Claude/Gemini-Prompt</button></div>
        <div id="av-preview"></div>
      </div>
    </div>`;

    const updateLabel = () => { $("#av-label").textContent = periodLabel(availWeeks()) + " · Betreff: " + mailSubject(availWeeks()); };
    updateLabel();
    $("#av-start").addEventListener("input", updateLabel);
    $("#av-count").addEventListener("input", updateLabel);

    scr.onclick = (e) => {
      if (e.target.closest("[data-apply]")) return applyAvailability();
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a;
      if (a === "gen") $("#av-tpl").value = buildTemplate(availWeeks(), "");
      else if (a === "genper") $("#av-tpl").value = locEmps().map((x) => buildTemplate(availWeeks(), x.name)).join("\n\n");
      else if (a === "copytpl") {
        const t = $("#av-tpl").value;
        if (!t) toast("Erst Vorlage erzeugen", "info");
        else copyText(t).then((ok) => { if (!ok) showTextSheet("Vorlage kopieren", "Alles markieren und kopieren, dann per Mail ans Team schicken:", t); });
      }
      else if (a === "prompt") showTextSheet(
        "Prompt für Claude/Gemini",
        "Nur nötig, wenn eine Antwort NICHT der Vorlage folgt (chaotische Mail): diesen Prompt zusammen mit der Mail in Claude oder Gemini einfügen — die KI formt sie in die Vorlage um, das Ergebnis unten bei „Antworten“ einfügen.",
        `Du bekommst unten formlose E-Mails über Arbeits-Verfügbarkeit. Wandle JEDE in genau dieses Format um und antworte NUR mit den ausgefüllten Blöcken.\nErlaubte Werte je Tag: ganz / vormittags / nachmittags / nicht. Nicht genannte Tage: "ganz". Nicht genannte Wochen: Block weglassen.\n\n${buildTemplate(availWeeks(), "")}\n\nE-Mails:\n<hier die E-Mails einfügen>`);
      else if (a === "parse") parseAndPreview();
      else if (a === "fetch" && DP.gmail) DP.gmail.fetch();
    };
  }

  function parseAndPreview(text) {
    text = text || $("#av-paste").value.trim();
    if (!text) return toast("Bitte Antworten einfügen", "info");
    S.avail.weeks = availWeeks();
    S.avail.parsed = parseResponses(text, S.avail.weeks);
    if (!S.avail.parsed.length) return toast("Keine Vorlagen-Blöcke erkannt", "error");
    const emps = S.doc.employees.filter((e) => e.active !== 0);

    const rows = S.avail.parsed.map((p, idx) => {
      const opts = '<option value="">—</option>' + emps.map((e) =>
        `<option value="${e.id}" ${p.emp && e.id === p.emp.id ? "selected" : ""}>${esc(e.kuerzel)} · ${esc(e.name)}</option>`).join("");
      const head = `<tr><td class="nm" colspan="8">
        <div style="font-size:11px;color:var(--ink-faint)">gelesen: ${esc(p.rawName || "?")}</div>
        <select class="ctl" style="min-height:38px;padding:4px 8px" data-map="${idx}">${opts}</select>
        ${p.warnings.length ? `<div class="avwarn">${esc(p.warnings.join(" · "))}</div>` : ""}</td></tr>`;
      const weekRows = S.avail.weeks.map((w) => {
        const wd = p.perWeek[w.week];
        const cells = [];
        for (let i = 0; i < 7; i++) {
          const v = wd ? wd[i] : undefined;
          cells.push(`<td>${v ? `<span class="avcell av-${v === "nm" ? "nm2" : v}">${AV_LABEL[v]}</span>` : '<span class="avwarn">—</span>'}</td>`);
        }
        return `<tr><td class="mono" style="font-size:12px">KW${w.week}</td>${cells.join("")}</tr>`;
      }).join("");
      return head + weekRows;
    }).join("");

    $("#av-preview").innerHTML = `<div class="scrollx"><table class="avtable">
      <thead><tr><th></th>${WDS.map((d) => `<th>${d}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody></table></div>
      <button class="btn btn--pri btn--block" style="margin-top:10px" data-apply>
        Übernehmen (${S.avail.weeks.length} Wochen)</button>`;
  }

  function applyAvailability() {
    let entries = 0, people = 0;
    document.querySelectorAll("#av-preview [data-map]").forEach((sel) => {
      const empId = sel.value ? +sel.value : null;
      if (!empId) return;
      const p = S.avail.parsed[+sel.dataset.map];
      let any = false;
      S.avail.weeks.forEach((w) => {
        const wd = p.perWeek[w.week];
        if (!wd) return; // Woche fehlte in der Antwort -> nichts ueberschreiben
        for (let i = 0; i < 7; i++) {
          const mode = wd[i];
          if (mode === null || mode === undefined) continue;
          S.doc.week_availability = S.doc.week_availability.filter(
            (r) => !(r.employee_id === empId && r.iso_year === w.year && r.iso_week === w.week && r.weekday === i));
          DP.model.insert(S.doc, "week_availability", { employee_id: empId, iso_year: w.year, iso_week: w.week, weekday: i, mode, note: null });
          entries++; any = true;
        }
      });
      if (any) people++;
    });
    if (!entries) return toast("Nichts zu übernehmen", "error");
    DP.storage.markDirty();
    toast(`Übernommen: ${people} Person(en) · ${entries} Einträge`, "success");
  }
  DP.ui = { parseAndPreview, toast, render: () => render() };

  /* ------------------------------ TEAM --------------------------------- */
  function renderTeam(scr) {
    const sections = S.doc.locations.map((l) => {
      const team = S.doc.employees.filter((e) => e.location_id === l.id && e.active !== 0)
        .sort((a, b) => (a.sort || 0) - (b.sort || 0));
      const rows = team.map((e) => `
        <button class="item" data-emp="${e.id}" style="--c:${esc(e.color)}"><span class="bar"></span>
          <span class="bd"><span class="ti">${esc(e.name)} <span class="mono" style="color:var(--ink-faint);font-size:12px">${esc(e.kuerzel)}</span></span>
          <span class="mt">${esc(e.employment_type || "")} · ${e.weekly_hours || 0} h${e.can_home_office ? " · Home" : ""}${e.can_open_close ? " · schließt" : ""}</span></span>
        </button>`).join("") || '<div class="empty">Noch kein Team.</div>';
      return `<section><div class="rowhead">
        <i class="dot" style="background:${esc(l.color)}"></i><h2>${esc(l.name)}</h2>
        <span class="muted">(${team.length})</span><span class="sp"></span>
        <button class="btn btn--sm btn--ghost" data-editloc="${l.id}">⚙</button>
        <button class="btn btn--sm" data-addemp="${l.id}">+ MA</button></div>
        <div class="list">${rows}</div></section>`;
    }).join("");
    scr.innerHTML = `<div class="page">
      <div><h1>Team & Standorte</h1>
      <p class="muted"><b>Fundament:</b> Jede Person ist fest einem Standort zugeordnet und wird nur dort verplant. Zuordnung im Personen-Editor änderbar.</p></div>
      ${sections}
      <button class="btn" data-addloc>+ Standort anlegen</button></div>`;
    scr.onclick = (e) => {
      const emp = e.target.closest("[data-emp]");
      const addE = e.target.closest("[data-addemp]");
      const edL = e.target.closest("[data-editloc]");
      const addL = e.target.closest("[data-addloc]");
      if (emp) employeeSheet(empById(+emp.dataset.emp));
      else if (addE) employeeSheet(null, +addE.dataset.addemp);
      else if (edL) locationSheet(S.doc.locations.find((l) => l.id === +edL.dataset.editloc));
      else if (addL) locationSheet(null);
    };
  }

  function employeeSheet(emp, presetLoc) {
    const isNew = !emp;
    const types = S.doc.settings.employment_types || ["Vollzeit"];
    const roles = S.doc.settings.roles || [];
    emp = emp || {
      location_id: presetLoc || S.locId, employment_type: types[0], weekly_hours: 40,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      availability: {}, school: [], roles: [], nogo: [],
      can_work_alone: 1, can_open_close: 0, can_home_office: 0, max_hours_day: 10,
    };
    const schoolMap = {}; (emp.school || []).forEach((s) => (schoolMap[s.weekday] = s.period));
    const av = emp.availability || {};
    const wdAvail = WDS.map((d, i) => `<div class="c"><small>${d}</small><select data-avl="${i}">
      ${[["yes", "Ja"], ["no", "—"], ["vm", "vm"], ["nm", "nm"]].map(([v, l]) => `<option value="${v}" ${(av[i] || "yes") === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>`).join("");
    const wdSchool = WDS.map((d, i) => `<div class="c"><small>${d}</small><select data-sch="${i}">
      ${[["", "—"], ["vm", "vm"], ["nm", "nm"], ["ganztags", "ganz"]].map(([v, l]) => `<option value="${v}" ${(schoolMap[i] || "") === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>`).join("");

    const body = `
      <div class="frow">
        <div class="field"><label>Name</label><input class="ctl" id="e-name" value="${esc(emp.name || "")}"></div>
        <div class="field"><label>Kürzel</label><input class="ctl mono" id="e-kz" value="${esc(emp.kuerzel || "")}" maxlength="4"></div>
      </div>
      <div class="frow">
        <div class="field"><label>Standort (fest)</label><select class="ctl" id="e-loc">
          ${S.doc.locations.map((l) => `<option value="${l.id}" ${l.id === emp.location_id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Farbe</label><input type="color" class="ctl" id="e-color" value="${esc(emp.color)}"></div>
      </div>
      <div class="frow">
        <div class="field"><label>Beschäftigung</label><select class="ctl" id="e-type">
          ${types.map((t) => `<option ${t === emp.employment_type ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
        <div class="field"><label>Wochenstunden</label><input type="number" class="ctl" id="e-hours" value="${emp.weekly_hours || 40}" min="0" max="60" step="0.5"></div>
      </div>
      <div class="field"><label>Standard-Verfügbarkeit</label><div class="wdgrid">${wdAvail}</div></div>
      <div class="field"><label>Berufsschule</label><div class="wdgrid">${wdSchool}</div></div>
      <div class="field"><label>Rollen</label><div class="chips">
        ${roles.map((r) => `<label class="chip"><input type="checkbox" data-role value="${esc(r)}" ${(emp.roles || []).includes(r) ? "checked" : ""}>${esc(r)}</label>`).join("")}</div></div>
      <label class="check"><input type="checkbox" id="e-open" ${emp.can_open_close ? "checked" : ""}> Darf auf-/zuschließen</label>
      <label class="check"><input type="checkbox" id="e-alone" ${emp.can_work_alone ? "checked" : ""}> Darf allein arbeiten</label>
      <label class="check"><input type="checkbox" id="e-home" ${emp.can_home_office ? "checked" : ""}> Darf Homeoffice</label>
      <div class="frow">
        <div class="field"><label>Max Std/Tag</label><input type="number" class="ctl" id="e-maxd" value="${emp.max_hours_day || 10}" min="1" max="24"></div>
        <div class="field"><label>Max Std/Woche</label><input type="number" class="ctl" id="e-maxw" value="${emp.max_hours_week || ""}" placeholder="auto"></div>
      </div>`;
    crudSheet({
      title: isNew ? "Neuer Mitarbeiter" : emp.name, isNew, body, table: "employees", rec: emp,
      buildData: (dlg) => {
        const g = (id) => dlg.querySelector(id);
        if (!g("#e-name").value.trim()) { toast("Name fehlt", "error"); return null; }
        const availability = {};
        dlg.querySelectorAll("[data-avl]").forEach((s) => (availability[s.dataset.avl] = s.value));
        const school = [];
        dlg.querySelectorAll("[data-sch]").forEach((s) => { if (s.value) school.push({ weekday: +s.dataset.sch, period: s.value }); });
        return {
          name: g("#e-name").value.trim(), kuerzel: g("#e-kz").value.trim(),
          location_id: +g("#e-loc").value, color: g("#e-color").value,
          employment_type: g("#e-type").value, weekly_hours: +g("#e-hours").value,
          availability, school, roles: [...dlg.querySelectorAll("[data-role]:checked")].map((c) => c.value),
          nogo: emp.nogo || [],
          can_open_close: g("#e-open").checked ? 1 : 0, can_work_alone: g("#e-alone").checked ? 1 : 0,
          can_home_office: g("#e-home").checked ? 1 : 0,
          max_hours_day: +g("#e-maxd").value || 10, max_hours_week: g("#e-maxw").value ? +g("#e-maxw").value : null,
          min_rest_hours: emp.min_rest_hours || 11, max_consecutive_days: emp.max_consecutive_days || 6,
          earliest_start: emp.earliest_start || null, latest_end: emp.latest_end || null,
          preferences: emp.preferences || null, secondary_locations: null, vacation_days_total: null,
          contract_start: null, contract_end: null, note: emp.note || null, active: 1, sort: emp.sort || 0,
        };
      },
    });
  }

  function locationSheet(l) {
    const isNew = !l;
    l = l || { color: "#2F5D8A", bundesland: "BW", open_on_holidays: 1 };
    const BL = Object.keys(DP.holidays.BUNDESLAENDER);
    const body = `
      <div class="frow">
        <div class="field"><label>Name</label><input class="ctl" id="l-name" value="${esc(l.name || "")}"></div>
        <div class="field"><label>Kürzel</label><input class="ctl mono" id="l-kz" value="${esc(l.kuerzel || "")}" maxlength="4"></div>
      </div>
      <div class="frow">
        <div class="field"><label>Bundesland</label><select class="ctl" id="l-bl">
          ${BL.map((b) => `<option ${b === l.bundesland ? "selected" : ""}>${b}</option>`).join("")}</select></div>
        <div class="field"><label>Farbe</label><input type="color" class="ctl" id="l-color" value="${esc(l.color)}"></div>
      </div>
      <label class="check"><input type="checkbox" id="l-hol" ${l.open_on_holidays ? "checked" : ""}> An Feiertagen grundsätzlich geöffnet</label>
      ${isNew ? '<p class="muted" style="font-size:13px">Betriebszeiten Mo–Fr 08–18, 2 Räume und Grundbesetzung werden angelegt (später änderbar).</p>' : ""}`;
    const foot = `${isNew ? "" : '<button class="btn btn--danger" data-del>Löschen</button>'}
      <span class="sp"></span><button class="btn" data-x>Abbrechen</button>
      <button class="btn btn--pri" data-save>Speichern</button>`;
    const { dlg, close } = sheet({ title: isNew ? "Neuer Standort" : l.name, body, foot });
    dlg.querySelector("[data-save]").addEventListener("click", () => {
      const g = (id) => dlg.querySelector(id);
      if (!g("#l-name").value.trim()) return toast("Name fehlt", "error");
      const data = {
        name: g("#l-name").value.trim(), kuerzel: g("#l-kz").value.trim(),
        bundesland: g("#l-bl").value, color: g("#l-color").value,
        open_on_holidays: g("#l-hol").checked ? 1 : 0,
      };
      if (isNew) {
        const rec = DP.model.insert(S.doc, "locations", Object.assign({ note: null, active: 1, sort: S.doc.locations.length }, data));
        for (let wd = 0; wd < 7; wd++) {
          const closed = wd > 4;
          DP.model.insert(S.doc, "operating_hours", { location_id: rec.id, weekday: wd, open_time: closed ? null : "08:00", close_time: closed ? null : "18:00", closed: closed ? 1 : 0 });
          if (!closed) {
            DP.model.insert(S.doc, "coverage_blocks", { location_id: rec.id, weekday: wd, start_time: "08:00", end_time: "14:00", min_staff: 2, role_required: null, note: null });
            DP.model.insert(S.doc, "coverage_blocks", { location_id: rec.id, weekday: wd, start_time: "14:00", end_time: "18:00", min_staff: 1, role_required: null, note: null });
          }
        }
        for (let r = 1; r <= 2; r++) DP.model.insert(S.doc, "rooms", { location_id: rec.id, name: "Raum " + r, sort: r });
      } else DP.model.update(S.doc, "locations", l.id, data);
      DP.storage.markDirty(); close(); render(); toast("Standort gespeichert", "success");
    });
    const del = dlg.querySelector("[data-del]");
    if (del) del.addEventListener("click", () => {
      const team = S.doc.employees.filter((e) => e.location_id === l.id && e.active !== 0);
      if (team.length) return toast(`Erst ${team.length} Mitarbeiter umziehen/löschen`, "error");
      DP.model.remove(S.doc, "locations", l.id);
      if (S.locId === l.id) S.locId = S.doc.locations[0] && S.doc.locations[0].id;
      DP.storage.markDirty(); close(); render(); toast("Standort gelöscht", "success");
    });
  }

  /* ------------------------------ EXPORT ------------------------------- */
  function renderExport(scr) {
    const { year, week } = wk();
    const l = loc();
    const st = DP.storage.state;
    scr.innerHTML = `<div class="page">
      <div><h1>Export & Daten</h1>
      <p class="muted">Exportiert wird <b>${esc(l.name)}</b>, KW ${week}. Woche im Plan-Tab wechseln.</p></div>
      <div class="card"><h2>Excel</h2>
        <p class="muted">Aushang (farbiges Wochenraster) + Stundenabrechnung in einer Datei — per Teilen an Gmail schicken, am PC drucken.</p>
        <div class="rowhead" style="flex-wrap:wrap;gap:8px">
          <button class="btn btn--pri" data-a="xlsx">${icon("out")} Excel erstellen</button>
          ${DP.drive && DP.drive.enabled ? '<button class="btn" data-a="xlsxdrive">→ In Google Drive</button>' : ""}</div></div>
      <div class="card"><h2>Google Kalender (.ics)</h2>
        <p class="muted">Titel wie gewohnt („NA 08:00 bis 17:00"). Pro Person = feste Farbe im Kalender.</p>
        <div class="rowhead" style="flex-wrap:wrap;gap:8px">
          <button class="btn" data-a="ics">Alle in einer Datei</button>
          <select class="ctl" id="x-emp" style="flex:1;min-width:130px">
            ${locEmps().map((e) => `<option value="${e.id}">${esc(e.kuerzel)} · ${esc(e.name)}</option>`).join("")}</select>
          <button class="btn" data-a="icsper">Nur diese Person</button>
          ${DP.drive && DP.drive.enabled ? '<button class="btn" data-a="icsdrive">→ In Google Drive</button>' : ""}</div></div>
      <div class="card"><h2>Datensicherung</h2>
        <p class="muted">Speicher: ${st.driveEnabled ? "Google Drive (" + esc(st.driveStatus) + ") + Gerät" : "auf diesem Gerät"} ·
          ${st.lastSavedAt ? "zuletzt gesichert " + st.lastSavedAt.toLocaleTimeString("de-DE").slice(0, 5) : "noch nicht extern gesichert"}</p>
        <div class="rowhead" style="flex-wrap:wrap;gap:8px">
          <button class="btn" data-a="backup">Backup-Datei</button>
          <button class="btn" data-a="restore">Backup laden</button>
          <button class="btn btn--danger btn--sm" data-a="demo">Demo zurücksetzen</button></div>
        <input type="file" id="x-file" accept=".json" style="display:none"></div>
    </div>`;

    scr.onclick = async (e) => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a;
      try {
        if (a === "xlsx") {
          const r = await DP.excel.exportExcel(S.doc, S.locId, year, week);
          await saveFile(r.filename, r.buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        } else if (a === "xlsxdrive") {
          const r = await DP.excel.exportExcel(S.doc, S.locId, year, week);
          await DP.drive.upload(r.filename, r.buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          toast("In Google Drive gespeichert: " + r.filename, "success");
        } else if (a === "icsdrive") {
          const r = DP.ics.exportCombined(S.doc, S.locId, year, week);
          await DP.drive.upload(r.filename, r.content, "text/calendar");
          toast("In Google Drive gespeichert: " + r.filename, "success");
        } else if (a === "ics") {
          const r = DP.ics.exportCombined(S.doc, S.locId, year, week);
          await saveFile(r.filename, r.content, "text/calendar");
        } else if (a === "icsper") {
          const empId = +$("#x-emp").value;
          const all = DP.ics.exportPerPerson(S.doc, S.locId, year, week);
          const one = all.find((p) => p.employee_id === empId);
          if (!one) return toast("Keine Termine für diese Person in KW " + week, "info");
          await saveFile(one.filename, one.content, "text/calendar");
        } else if (a === "backup") {
          const r = DP.storage.exportJSON();
          await saveFile(r.filename, r.content, "application/json");
        } else if (a === "restore") {
          const inp = $("#x-file");
          inp.onchange = async () => {
            const f = inp.files[0]; if (!f) return;
            try { DP.storage.importJSON(await f.text()); S.doc = DP.storage.state.doc; render(); toast("Backup geladen", "success"); }
            catch (err) { toast("Datei ungültig: " + err.message, "error"); }
          };
          inp.click();
        } else if (a === "demo") {
          if (confirm("Wirklich alle Daten durch die Demo ersetzen?")) {
            S.doc = DP.storage.resetDemo(); S.locId = S.doc.locations[0].id; render(); toast("Demo geladen", "success");
          }
        }
      } catch (err) { toast("Fehler: " + err.message, "error"); }
    };
  }

  /* ------------------------------ Boot --------------------------------- */
  function bootError(msg) {
    const app = document.getElementById("app");
    if (app && !app.querySelector(".screen, .tabs")) {
      app.innerHTML = `<div style="padding:24px;font-family:system-ui;max-width:60ch">
        <h2 style="margin-bottom:8px">Dienstplaner konnte nicht starten</h2>
        <p style="opacity:.8">Bitte diese Meldung an den Support (Claude-Chat) weitergeben:</p>
        <pre style="white-space:pre-wrap;background:rgba(128,128,128,.15);padding:10px;border-radius:8px;margin-top:8px">Phase: ${bootPhase}
${String(msg).slice(0, 1200)}</pre>
        <button onclick="location.reload()" style="margin-top:12px;padding:10px 16px;border-radius:8px">Neu laden</button>
      </div>`;
    }
  }
  window.addEventListener("error", (e) => bootError((e.error && e.error.stack) || e.message + (e.filename ? "\n" + e.filename + ":" + e.lineno : "")));
  window.addEventListener("unhandledrejection", (e) => bootError((e.reason && (e.reason.stack || e.reason.message)) || String(e.reason)));

  let bootPhase = "start";
  async function boot() {
    try { const t = localStorage.getItem("dp-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
    if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = "dark";
    bootPhase = "storage";
    S.doc = await DP.storage.init();
    // Selbstheilung: unbrauchbarer Datenbestand -> frische Demo statt Absturz
    if (!S.doc || !Array.isArray(S.doc.locations) || !S.doc.locations.length) {
      S.doc = DP.storage.resetDemo();
    }
    bootPhase = "render";
    S.locId = S.doc.locations[0] && S.doc.locations[0].id;
    S.day = (new Date().getDay() + 6) % 7;
    const mq = window.matchMedia("(min-width: 700px)");
    const onModeChange = () => render();
    if (mq.addEventListener) mq.addEventListener("change", onModeChange);
    else mq.addListener(onModeChange);
    window.addEventListener("orientationchange", () => setTimeout(render, 150));
    render();
  }
  boot().catch((e) => bootError(e && e.message ? e.message : String(e)));
})();
