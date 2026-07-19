import { API } from "./api.js";

/* =======================================================================
   Icons (24x24, currentColor)
   ======================================================================= */
const ICON = {
  anchor: `<circle cx="12" cy="5" r="2.3"/><line x1="12" y1="7.3" x2="12" y2="21"/><path d="M5 12a7 7 0 0 0 14 0"/><line x1="3.4" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="20.6" y2="12"/>`,
  calendar: `<rect x="3.5" y="4.5" width="17" height="16" rx="2"/><line x1="3.5" y1="9" x2="20.5" y2="9"/><line x1="8" y1="2.5" x2="8" y2="6"/><line x1="16" y1="2.5" x2="16" y2="6"/>`,
  users: `<circle cx="9" cy="8" r="3.1"/><path d="M3.6 20a5.4 5.4 0 0 1 10.8 0"/><path d="M16 5.3a3.1 3.1 0 0 1 0 5.6"/><path d="M17.5 14.3A5.4 5.4 0 0 1 20.4 19"/>`,
  sliders: `<line x1="4" y1="7" x2="20" y2="7"/><circle cx="9" cy="7" r="2.1"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="15" cy="17" r="2.1"/>`,
  layers: `<path d="M12 3 21 8l-9 5-9-5 9-5Z"/><path d="M3 13l9 5 9-5"/>`,
  download: `<path d="M12 3v11"/><path d="M8 11l4 4 4-4"/><path d="M4.5 20h15"/>`,
  chevL: `<path d="M15 5l-7 7 7 7"/>`,
  chevR: `<path d="M9 5l7 7-7 7"/>`,
  phone: `<path d="M6 3.6c.9 0 1.5.4 1.9 1.3l.9 2.1c.3.8.1 1.4-.5 1.9l-.8.8c1 1.9 2.5 3.4 4.4 4.4l.8-.8c.5-.6 1.1-.8 1.9-.5l2.1.9c.9.4 1.3 1 1.3 1.9v1.9c0 1.1-.9 1.9-2 1.8C10.3 21.4 3.6 14.7 3.2 6.1 3.1 5 3.9 4 5 4h1Z"/>`,
  cap: `<path d="M12 4 2.6 8.4 12 12.8l9.4-4.4L12 4Z"/><path d="M6 10.4V15c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8v-4.6"/>`,
  wrench: `<path d="M14.8 5.6a4 4 0 0 0-5 5L4 16.4 7.6 20l5.8-5.8a4 4 0 0 0 5-5l-2.5 2.5-2.4-.6-.6-2.4 2.4-2.5Z"/>`,
  lock: `<rect x="5.2" y="10.5" width="13.6" height="9.3" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>`,
  sun: `<circle cx="12" cy="12" r="3.8"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M19.2 4.8l-1.6 1.6M6.4 17.6l-1.6 1.6"/>`,
  moon: `<path d="M20 14.4A8 8 0 1 1 9.6 4 6.5 6.5 0 0 0 20 14.4Z"/>`,
  alert: `<path d="M12 3.5 2.8 20h18.4L12 3.5Z"/><line x1="12" y1="10" x2="12" y2="14.4"/><circle cx="12" cy="17.4" r="0.7" fill="currentColor" stroke="none"/>`,
  wand: `<path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7"/><circle cx="12" cy="12" r="2.6"/>`,
  target: `<circle cx="12" cy="12" r="7.8"/><circle cx="12" cy="12" r="2.8"/>`,
  home: `<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/>`,
  inbox: `<path d="M4 13h4l1.5 2.5h5L16 13h4"/><path d="M4 13 6.4 5.6A2 2 0 0 1 8.3 4.2h7.4a2 2 0 0 1 1.9 1.4L20 13v4.8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>`,
  copy: `<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>`,
};
const icon = (name, cls) =>
  `<svg class="${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[name] || ""}</svg>`;

/* =======================================================================
   Zustand & Helfer
   ======================================================================= */
const WD_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const KIND_ICON = { kurs: "cap", telefon: "phone", zbv: "wrench", event: "target" };

const state = { boot: null, empById: {}, catalogs: {}, locId: null, monday: null, week: null, view: "plan" };

const $ = (sel, root = document) => root.querySelector(sel);
const pad = (n) => String(n).padStart(2, "0");
const toMin = (t) => { const [h, m] = t.split(":"); return +h * 60 + +m; };

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThu) / 864e5 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return { year: d.getUTCFullYear(), week };
}
function mondayOf(date) {
  const d = new Date(date);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  d.setHours(0, 0, 0, 0);
  return d;
}
function rangeLabel(dates) {
  const a = new Date(dates[0] + "T00:00:00"), b = new Date(dates[6] + "T00:00:00");
  const sameMonth = a.getMonth() === b.getMonth();
  const left = sameMonth ? `${a.getDate()}.` : `${a.getDate()}. ${MONTHS[a.getMonth()]}`;
  return `${left}–${b.getDate()}. ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
}
function hexText(hex) {
  const h = (hex || "#888888").replace("#", "");
  const c = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  const lin = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(c(0)) + 0.7152 * lin(c(2)) + 0.0722 * lin(c(4));
  return L > 0.5 ? "#12212f" : "#f2f6fb";
}
function catalog(name) {
  const map = {};
  (state.boot.settings[name] || []).forEach((x) => { if (x && x.id) map[x.id] = x; });
  return map;
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

/* =======================================================================
   Init
   ======================================================================= */
async function init() {
  $("#brandMark").innerHTML = icon("anchor");
  try {
    state.boot = await API.bootstrap();
  } catch (e) {
    document.body.innerHTML = `<div style="padding:2rem;font-family:system-ui">Server nicht erreichbar: ${esc(e.message)}</div>`;
    return;
  }
  state.boot.employees.forEach((e) => (state.empById[e.id] = e));
  state.locId = state.boot.locations[0]?.id || null;
  state.monday = mondayOf(new Date(state.boot.today + "T00:00:00"));

  renderSidebar();
  updateThemeIcon();
  wireGlobal();
  await loadWeek();
}

/* =======================================================================
   Sidebar
   ======================================================================= */
function renderSidebar() {
  const locs = state.boot.locations;
  $("#locList").innerHTML = locs.map((l) => `
    <button class="loc" data-loc="${l.id}" aria-current="${l.id === state.locId}">
      <span class="loc__dot" style="background:${esc(l.color)}"></span>
      <span class="loc__name">${esc(l.name)}</span>
      <span class="loc__meta">${esc(l.kuerzel || "")}</span>
    </button>`).join("");

  const items = [
    ["plan", "calendar", "Wochenplan"],
    ["setup", "sliders", "Wochen-Setup"],
    ["avail", "inbox", "Verfügbarkeit"],
    ["staff", "users", "Stammdaten"],
    ["templates", "layers", "Vorlagen"],
    ["export", "download", "Export"],
  ];
  $("#nav").innerHTML = items.map(([id, ic, label]) => `
    <button class="nav__item ${id === state.view ? "is-active" : ""}" data-view="${id}">
      ${icon(ic)}<span>${label}</span>
    </button>`).join("");

  $("#locList").addEventListener("click", (e) => {
    const b = e.target.closest(".loc"); if (!b) return;
    state.locId = +b.dataset.loc;
    renderSidebar(); loadWeek();
  });
  $("#nav").addEventListener("click", (e) => {
    const b = e.target.closest(".nav__item"); if (!b) return;
    state.view = b.dataset.view;
    renderSidebar(); loadWeek();
  });
}

/* =======================================================================
   Topbar
   ======================================================================= */
function renderTopbar() {
  const bar = $("#topbar");
  const loc = state.boot.locations.find((l) => l.id === state.locId);
  const isWeekView = ["plan", "setup", "export"].includes(state.view);
  if (!isWeekView) {
    bar.innerHTML = `<div class="topbar__loc"><span class="loc__dot" style="background:${esc(loc.color)}"></span>${esc(loc.name)}</div>`;
    return;
  }
  const isPlan = state.view === "plan";
  const wk = state.week;
  const { week } = isoWeek(state.monday);
  const warnCount = wk ? (wk._plan?.warnings?.length ?? null) : null;

  bar.innerHTML = `
    <div class="weeknav">
      <button class="btn btn--icon btn--ghost" data-act="prev" title="Vorige Woche">${icon("chevL")}</button>
      <div class="weeknav__label">
        <span class="weeknav__kw">KW ${week}</span>
        <span class="weeknav__range">${wk ? rangeLabel(wk.dates) : ""}</span>
      </div>
      <button class="btn btn--icon btn--ghost" data-act="next" title="Nächste Woche">${icon("chevR")}</button>
      <button class="btn btn--sm btn--ghost" data-act="today" title="Aktuelle Woche">${icon("target")}<span>Heute</span></button>
    </div>
    <div class="topbar__loc"><span class="loc__dot" style="background:${esc(loc.color)}"></span>${esc(loc.name)}</div>
    <div class="topbar__spacer"></div>
    ${isPlan && warnCount !== null ?
      `<button class="warnpill" data-state="${warnCount ? "warn" : "ok"}" data-act="warn">
        ${icon("alert")}<span>${warnCount ? "Warnungen" : "Alles frei"}</span>${warnCount ? `<span class="warnpill__count">${warnCount}</span>` : ""}
      </button>` : ""}
    ${isPlan ? `<button class="btn" data-act="export">${icon("download")}<span>Export</span></button>` : ""}
    ${isPlan ? `<button class="btn btn--primary" data-act="plan">${icon("wand")}<span>Auto-Plan</span></button>` : ""}
  `;

  bar.onclick = (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act;
    if (act === "prev") { state.monday.setDate(state.monday.getDate() - 7); loadWeek(); }
    else if (act === "next") { state.monday.setDate(state.monday.getDate() + 7); loadWeek(); }
    else if (act === "today") { state.monday = mondayOf(new Date(state.boot.today + "T00:00:00")); loadWeek(); }
    else if (act === "warn") openWarnings();
    else if (act === "plan") runAutoPlan();
    else if (act === "export") { state.view = "export"; renderSidebar(); loadWeek(); }
  };
}

/* =======================================================================
   Woche laden & rendern
   ======================================================================= */
async function loadWeek() {
  if (!["plan", "setup", "export"].includes(state.view)) { render(); return; }
  const { year, week } = isoWeek(state.monday);
  renderTopbar();
  try {
    state.week = await API.week(state.locId, year, week);
  } catch (e) { toast(e.message, "error"); return; }
  render();
  renderTopbar();
}

function render() {
  if (state.view === "plan") return renderCalendar();
  if (state.view === "setup") return renderSetup();
  if (state.view === "staff") return renderStaff();
  if (state.view === "export") return renderExport();
  if (state.view === "avail") return renderAvailability();
  return renderPlaceholder();
}

function renderPlaceholder() {
  const titles = {
    setup: ["Wochen-Setup", "Abwesenheiten, Freiwünsche, Kurse und Sonderaufgaben dieser Woche – kommt als Nächstes."],
    staff: ["Stammdaten & Einstellungen", "Standorte, Mitarbeiter, Räume, Regeln und Kataloge – alles frei editierbar, kommt als Nächstes."],
    templates: ["Vorlagen & Muster", "Wiederkehrende Muster und komplette Wochen-Vorlagen – kommt als Nächstes."],
    export: ["Export", "Excel (Aushang + Abrechnung) und Google Kalender (.ics) – kommt als Nächstes."],
  };
  const [t, sub] = titles[state.view] || ["", ""];
  $("#content").innerHTML = `
    <div class="placeholder"><div class="placeholder__inner">
      <div class="placeholder__mark">${icon("layers")}</div>
      <h2>${esc(t)}</h2><p>${esc(sub)}</p>
    </div></div>`;
  renderTopbar();
}

function renderExport() {
  const { year, week } = isoWeek(state.monday);
  const loc = state.boot.locations.find((l) => l.id === state.locId);
  const range = state.week ? rangeLabel(state.week.dates) : "";
  const q = `location_id=${state.locId}&year=${year}&week=${week}`;
  $("#content").innerHTML = `<div class="export-page">
    <h1>Export</h1>
    <p class="setup-intro">Exportiert wird: <b>${esc(loc.name)}</b> · KW ${week} · ${esc(range)}. Woche über die Pfeile oben, Standort in der Sidebar wechseln.</p>
    <div class="export-grid">
      <div class="export-card">
        <div class="export-card__icon">${icon("download")}</div>
        <h2>Excel</h2>
        <p>Farbiger Aushang zum Ausdrucken plus Stundenabrechnung je Person — beides in einer Datei.</p>
        <a class="btn btn--primary" href="/api/export/excel?${q}" download>Excel herunterladen</a>
      </div>
      <div class="export-card">
        <div class="export-card__icon">${icon("calendar")}</div>
        <h2>Google Kalender</h2>
        <p>Ein Kalender pro Person mit fester Farbe — genau wie im gewohnten Kalender. Titel im Format „NA 08:00 bis 17:00".</p>
        <div class="export-actions">
          <a class="btn btn--primary" href="/api/export/ics?${q}&mode=perperson" download>Pro Person (ZIP)</a>
          <a class="btn" href="/api/export/ics?${q}&mode=combined" download>Alles in einem (.ics)</a>
        </div>
        <p class="export-hint">Import in Google Kalender: Einstellungen → Importieren &amp; Exportieren → Datei wählen → je Person den passenden Zielkalender.</p>
      </div>
    </div>
  </div>`;
  renderTopbar();
}

function renderCalendar() {
  const wk = state.week;
  const view = state.boot.settings.view || { start_hour: 7, end_hour: 20 };
  const startH = view.start_hour, endH = view.end_hour;
  const pxH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--px-per-hour")) || 58;
  const gridH = (endH - startH) * pxH;
  const dates = wk.dates;
  const today = state.boot.today;

  const op = {}; (wk.operating_hours || []).forEach((o) => (op[o.weekday] = o));
  const special = {}; (wk.special_days || []).forEach((s) => (special[s.date] = s));
  const absByDay = alldayChips(wk, dates);

  // Kopf
  let head = `<div class="cal-head-cell cal-head-cell--corner"></div>`;
  let allday = `<div class="cal-allday-cell cal-allday-cell--label"><span>ganz-<br>tägig</span></div>`;
  dates.forEach((iso, i) => {
    const d = new Date(iso + "T00:00:00");
    const isToday = iso === today;
    const hol = wk.holidays[iso];
    head += `<div class="cal-head-cell ${isToday ? "is-today" : ""}">
      <div class="cal-head__wd">${WD_LONG[i]}</div>
      <div class="cal-head__row"><span class="cal-head__day">${d.getDate()}.</span></div>
      ${hol ? `<div class="cal-head__holiday" title="${esc(hol)}">${esc(hol)}</div>` : ""}
    </div>`;
    allday += `<div class="cal-allday-cell">${absByDay[iso].map(chipHtml).join("")}</div>`;
  });

  // Zeitachse
  let axis = `<div class="time-axis" style="height:${gridH}px">`;
  for (let h = startH; h <= endH; h++) {
    axis += `<div class="time-axis__tick" style="top:${(h - startH) * pxH}px">${pad(h)}:00</div>`;
  }
  axis += `</div>`;

  // Tagesspalten mit Schichten
  const byDay = {}; dates.forEach((d) => (byDay[d] = []));
  (wk.assignments || []).forEach((a) => { if (byDay[a.date]) byDay[a.date].push(a); });

  let cols = "";
  dates.forEach((iso, i) => {
    const wd = i;
    const isToday = iso === today;
    const sp = special[iso];
    const oh = op[wd];
    const closed = sp ? sp.closed : oh ? oh.closed : 0;
    const openMin = closed ? null : toMin((sp && sp.open_time) || (oh && oh.open_time) || "08:00");
    const closeMin = closed ? null : toMin((sp && sp.close_time) || (oh && oh.close_time) || "18:00");

    let blocks = "";
    if (!closed) {
      // Randzeiten (vor Öffnung / nach Schluss) dezent schraffieren
      if (openMin > startH * 60) blocks += `<div class="day-col__closed" style="top:0;height:${(openMin - startH * 60) / 60 * pxH}px"></div>`;
      if (closeMin < endH * 60) blocks += `<div class="day-col__closed" style="top:${(closeMin - startH * 60) / 60 * pxH}px;bottom:0"></div>`;
    }

    const packed = packEvents(byDay[iso].map((a) => ({ a, s: toMin(a.start_time), e: toMin(a.end_time) })));
    packed.forEach((ev) => { blocks += shiftHtml(ev, startH, pxH); });

    // "Jetzt"-Linie
    let now = "";
    if (isToday) {
      const n = new Date();
      const nowMin = n.getHours() * 60 + n.getMinutes();
      if (nowMin >= startH * 60 && nowMin <= endH * 60)
        now = `<div class="now-line" style="top:${(nowMin - startH * 60) / 60 * pxH}px"></div>`;
    }

    cols += `<div class="day-col ${isToday ? "is-today" : ""} ${closed ? "is-closed" : ""}" style="height:${gridH}px" data-date="${iso}">${blocks}${now}</div>`;
  });

  $("#content").innerHTML = `
    ${hoursStrip()}
    <div class="calendar"><div class="cal-scroll"><div class="cal-grid">
      ${head}${allday}${axis}${cols}
    </div></div></div>`;

  attachCalendarInteractions(pxH, startH, endH);
}

/* Kalender-Interaktion: klicken (anlegen/bearbeiten), ziehen (verschieben), Rand ziehen (verlängern) */
function attachCalendarInteractions(pxH, startH, endH) {
  const grid = $(".cal-grid");
  const dayMin = startH * 60, dayMax = endH * 60;
  const snap = (m) => Math.round(m / 15) * 15;

  grid.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const shiftEl = e.target.closest(".shift");
    const col = e.target.closest(".day-col");
    if (!col && !shiftEl) return;

    const cols = [...grid.querySelectorAll(".day-col")].map((c) => ({ el: c, date: c.dataset.date, rect: c.getBoundingClientRect() }));
    const startX = e.clientX, startY = e.clientY;
    let moved = false;

    // --- Schicht ziehen / vergrößern ---
    if (shiftEl) {
      const a = (state.week.assignments || []).find((x) => x.id === +shiftEl.dataset.id);
      if (!a) return;
      const resize = !!e.target.closest(".shift__resize");
      const oStart = toMin(a.start_time), oEnd = toMin(a.end_time), dur = oEnd - oStart;
      let curCol = cols.find((c) => c.date === a.date) || cols[0];

      const move = (ev) => {
        const dy = ev.clientY - startY;
        if (!moved && Math.hypot(ev.clientX - startX, dy) > 4) { moved = true; shiftEl.classList.add("is-dragging"); }
        if (!moved) return;
        if (resize) {
          let end = snap(oStart + Math.round(dy / pxH * 60) + dur);
          end = Math.max(oStart + 15, Math.min(dayMax, end));
          shiftEl.style.height = (end - oStart) / 60 * pxH + "px";
          shiftEl.querySelector(".shift__t").textContent = `${to_hhmm2(oStart)}–${to_hhmm2(end)}`;
        } else {
          let ns = snap(oStart + Math.round(dy / pxH * 60));
          ns = Math.max(dayMin, Math.min(dayMax - dur, ns));
          shiftEl.style.top = (ns - dayMin) / 60 * pxH + "px";
          const target = cols.find((c) => ev.clientX >= c.rect.left && ev.clientX < c.rect.right);
          cols.forEach((c) => c.el.classList.remove("drag-over"));
          if (target) { target.el.classList.add("drag-over"); curCol = target; }
          shiftEl.querySelector(".shift__t").textContent = `${to_hhmm2(ns)}–${to_hhmm2(ns + dur)}`;
        }
      };
      const up = async (ev) => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        cols.forEach((c) => c.el.classList.remove("drag-over"));
        shiftEl.classList.remove("is-dragging");
        if (!moved) { openShiftEditor(a); return; }
        try {
          if (resize) {
            let end = snap(oStart + Math.round((ev.clientY - startY) / pxH * 60) + dur);
            end = Math.max(oStart + 15, Math.min(dayMax, end));
            await API.update("assignments", a.id, { end_time: to_hhmm2(end), locked: 1, auto_generated: 0 });
          } else {
            let ns = snap(oStart + Math.round((ev.clientY - startY) / pxH * 60));
            ns = Math.max(dayMin, Math.min(dayMax - dur, ns));
            const iso = isoWeek(new Date(curCol.date + "T00:00:00"));
            await API.update("assignments", a.id, { date: curCol.date, start_time: to_hhmm2(ns), end_time: to_hhmm2(ns + dur), iso_year: iso.year, iso_week: iso.week, locked: 1, auto_generated: 0 });
          }
          await refreshCalendar();
        } catch (err) { toast(err.message, "error"); await refreshCalendar(); }
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      return;
    }

    // --- leere Fläche: Klick = neue Schicht ---
    const up = (ev) => {
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointermove", mv);
      if (moved) return;
      const y = ev.clientY - col.getBoundingClientRect().top;
      const start = Math.max(dayMin, Math.min(dayMax - 60, snap(dayMin + y / pxH * 60)));
      openShiftEditor({ date: col.dataset.date, start_time: to_hhmm2(start), end_time: to_hhmm2(start + 60) });
    };
    const mv = (ev) => { if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) moved = true; };
    document.addEventListener("pointermove", mv);
    document.addEventListener("pointerup", up);
  });
}

function to_hhmm2(m) { return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }

async function refreshCalendar() {
  const { year, week } = isoWeek(state.monday);
  const prev = state.week?._plan;
  state.week = await API.week(state.locId, year, week);
  if (prev) state.week._plan = prev;
  renderCalendar(); renderTopbar();
}

function shiftHtml(ev, startH, pxH) {
  const a = ev.a;
  const emp = state.empById[a.employee_id] || {};
  const color = emp.color || "#5A6B7A";
  const txt = hexText(color);
  const top = (ev.s - startH * 60) / 60 * pxH;
  const h = Math.max(18, (ev.e - ev.s) / 60 * pxH);
  const left = ev.left * 100, width = ev.width * 100;
  const kIcon = KIND_ICON[a.kind] ? icon(KIND_ICON[a.kind], "shift__icon") : "";
  let label = "";
  if (a.kind === "kurs") { const c = (state.week.courses || []).find((x) => x.id === a.course_id); label = c?.title || "Kurs"; }
  else if (a.kind === "zbv") label = a.task_text || "Aufgabe";
  else if (a.kind === "telefon") label = "Telefon" + (a.work_mode === "home" ? " · Zuhause" : "");
  const showLabel = label && h > 34;

  return `<div class="shift ${a.work_mode === "home" ? "is-home" : ""} ${a.locked ? "is-locked" : ""}"
      data-kind="${a.kind}" data-id="${a.id}"
      style="top:${top}px;height:${h}px;left:calc(${left}% + 2px);width:calc(${width}% - 4px);background:${color};color:${txt}"
      title="${esc(emp.name || "")} · ${a.start_time}–${a.end_time}">
      <div class="shift__top">${kIcon}<span class="shift__k">${esc(emp.kuerzel || "?")}</span><span class="shift__t">${a.start_time}–${a.end_time}</span></div>
      ${showLabel ? `<div class="shift__label">${esc(label)}</div>` : ""}
      <div class="shift__resize"></div>
    </div>`;
}

/* Ganztags-Chips aus Abwesenheiten */
function alldayChips(wk, dates) {
  const cat = catalog("absence_types");
  const byDay = {}; dates.forEach((d) => (byDay[d] = []));
  (wk.absences || []).forEach((a) => {
    const emp = state.empById[a.employee_id]; if (!emp) return;
    const t = cat[a.type] || { label: a.type, color: "#8894a2" };
    const chip = { kz: emp.kuerzel, label: t.label, color: t.color };
    if (!a.date) dates.forEach((d) => byDay[d].push(chip));
    else if (a.end_date) dates.forEach((d) => { if (d >= a.date && d <= a.end_date) byDay[d].push(chip); });
    else if (byDay[a.date]) byDay[a.date].push(chip);
  });
  return byDay;
}
function chipHtml(c) {
  return `<span class="status-chip" style="--chip:${esc(c.color)}"><span class="status-chip__dot"></span>${esc(c.kz)} · ${esc(c.label)}</span>`;
}

/* Fairness-Leiste (Ist-Stunden je Person) */
function hoursStrip() {
  const emps = state.boot.employees.filter((e) => e.location_id === state.locId && e.active);
  const mins = {}; emps.forEach((e) => (mins[e.id] = 0));
  (state.week.assignments || []).forEach((a) => {
    if (mins[a.employee_id] != null) mins[a.employee_id] += toMin(a.end_time) - toMin(a.start_time);
  });
  const chips = emps.map((e) => {
    const h = (mins[e.id] / 60).toFixed(1).replace(".0", "");
    const soll = e.weekly_hours ? ` / ${e.weekly_hours}` : "";
    return `<span class="hours-chip"><span class="hours-chip__dot" style="background:${esc(e.color)}"></span><span class="hours-chip__k">${esc(e.kuerzel)}</span><span class="hours-chip__h">${h}${soll} h</span></span>`;
  }).join("");
  return `<div class="hours-strip">${chips}</div>`;
}

/* Überlappende Schichten in Spalten packen */
function packEvents(evs) {
  evs.sort((a, b) => a.s - b.s || a.e - b.e);
  let group = [], groupEnd = -1;
  const flush = () => {
    const colsEnd = [];
    group.forEach((ev) => {
      let placed = false;
      for (let i = 0; i < colsEnd.length; i++) if (colsEnd[i] <= ev.s) { colsEnd[i] = ev.e; ev.col = i; placed = true; break; }
      if (!placed) { ev.col = colsEnd.length; colsEnd.push(ev.e); }
    });
    const n = colsEnd.length;
    group.forEach((ev) => { ev.left = ev.col / n; ev.width = 1 / n; });
    group = []; groupEnd = -1;
  };
  evs.forEach((ev) => {
    if (group.length && ev.s >= groupEnd) flush();
    group.push(ev); groupEnd = Math.max(groupEnd, ev.e);
  });
  if (group.length) flush();
  return evs;
}

/* =======================================================================
   Auto-Plan
   ======================================================================= */
async function runAutoPlan() {
  const btn = $('[data-act="plan"]'); if (btn) { btn.disabled = true; btn.style.opacity = 0.7; }
  const { year, week } = isoWeek(state.monday);
  try {
    const res = await API.plan({ location_id: state.locId, year, week, mode: "replan" });
    state.week = await API.week(state.locId, year, week);
    state.week._plan = res;
    render(); renderTopbar();
    const w = res.warnings.length;
    toast(`Plan erstellt · ${res.created} Schichten${w ? ` · ${w} Warnung${w > 1 ? "en" : ""}` : " · keine Konflikte"}`, w ? "info" : "success");
  } catch (e) { toast(e.message, "error"); }
  finally { if (btn) { btn.disabled = false; btn.style.opacity = 1; } }
}

/* =======================================================================
   Warnungen-Drawer
   ======================================================================= */
function openWarnings() {
  const w = state.week?._plan?.warnings || [];
  $("#drawerTitle").textContent = `Warnungen (${w.length})`;
  $("#drawerBody").innerHTML = w.length
    ? w.map((x) => {
        const d = new Date(x.date + "T00:00:00");
        return `<div class="warn-item" data-sev="${x.severity}">
          <span class="warn-item__sev"></span>
          <div><div class="warn-item__date">${WD_LONG[(d.getDay() + 6) % 7].slice(0, 2)} ${d.getDate()}.${d.getMonth() + 1}.</div>
          <div class="warn-item__msg">${esc(x.message)}</div></div></div>`;
      }).join("")
    : `<p style="color:var(--ink-muted)">Keine Konflikte in dieser Woche.</p>`;
  $("#drawer").classList.add("is-open");
  $("#drawer").setAttribute("aria-hidden", "false");
  $("#drawerBackdrop").classList.add("is-open");
}
function closeDrawer() {
  $("#drawer").classList.remove("is-open");
  $("#drawer").setAttribute("aria-hidden", "true");
  $("#drawerBackdrop").classList.remove("is-open");
}

/* =======================================================================
   Theme, Toast, globale Events
   ======================================================================= */
function updateThemeIcon() {
  const dark = (document.documentElement.getAttribute("data-theme") || "dark") !== "light";
  $("#themeToggle").innerHTML = icon(dark ? "sun" : "moon");
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  const next = cur === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("dp-theme", next); } catch (e) {}
  updateThemeIcon();
}
let toastTimer;
function toast(msg, kind = "info") {
  const el = document.createElement("div");
  el.className = "toast"; el.dataset.kind = kind;
  el.innerHTML = `<span class="toast__dot"></span><span>${esc(msg)}</span>`;
  $("#toasts").appendChild(el);
  clearTimeout(toastTimer);
  setTimeout(() => el.remove(), 4200);
}
function wireGlobal() {
  $("#themeToggle").addEventListener("click", toggleTheme);
  $("#drawerClose").addEventListener("click", closeDrawer);
  $("#drawerBackdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
    if (state.view === "plan" && (e.target.tagName || "") !== "INPUT") {
      if (e.key === "ArrowLeft") { state.monday.setDate(state.monday.getDate() - 7); loadWeek(); }
      if (e.key === "ArrowRight") { state.monday.setDate(state.monday.getDate() + 7); loadWeek(); }
    }
  });
}

/* =======================================================================
   Verfügbarkeit: Vorlage erzeugen + Antworten (Freitext-Vorlage) importieren
   ======================================================================= */
const availState = { weeks: [], parsed: [] };

function fmtDMY(d) { return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; }

function weeksFromMonday(monday, count) {
  const weeks = [];
  for (let i = 0; i < count; i++) {
    const m = new Date(monday); m.setDate(m.getDate() + i * 7);
    const s = new Date(m); s.setDate(s.getDate() + 6);
    const iso = isoWeek(m);
    weeks.push({ year: iso.year, week: iso.week, monday: m, sunday: s });
  }
  return weeks;
}

function currentAvailWeeks() {
  const startVal = $("#av-start").value;
  const count = Math.max(1, Math.min(12, +$("#av-count").value || 4));
  const monday = mondayOf(new Date((startVal || state.boot.today) + "T00:00:00"));
  return weeksFromMonday(monday, count);
}

function periodLabel(weeks) {
  const a = weeks[0], b = weeks[weeks.length - 1];
  const kw = weeks.length > 1 ? `KW ${a.week}–${b.week}` : `KW ${a.week}`;
  return `${kw}  (${fmtDMY(a.monday)}–${fmtDMY(b.sunday)})`;
}

function buildTemplate(weeks, name) {
  return `════════ VERFÜGBARKEIT ════════
Name: ${name || ""}
Zeitraum: ${periodLabel(weeks)}

Wie oft kannst du an dem Wochentag arbeiten?
Bitte je Zeile EIN Wort:  ganz / vormittags / nachmittags / nicht

Mo:
Di:
Mi:
Do:
Fr:
Sa:
So:
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
  const emps = state.boot.employees.filter((e) => e.active !== 0);
  const n = name.toLowerCase().replace(/\s+/g, " ").trim();
  let m = emps.find((e) => e.name.toLowerCase() === n);
  if (!m) m = emps.find((e) => (e.kuerzel || "").toLowerCase() === n);
  if (!m) m = emps.find((e) => e.name.toLowerCase().includes(n) || n.includes(e.name.toLowerCase()));
  if (!m) { const toks = n.split(" ").filter((t) => t.length > 2); m = emps.find((e) => toks.some((t) => e.name.toLowerCase().includes(t))); }
  return m || null;
}

function parseResponses(text) {
  const blocks = text.split(/(?=^\s*name\s*:)/mi).map((b) => b.trim()).filter(Boolean);
  const days = [["mo", "montag"], ["di", "dienstag"], ["mi", "mittwoch"], ["do", "donnerstag"], ["fr", "freitag"], ["sa", "samstag"], ["so", "sonntag"]];
  return blocks.map((block) => {
    const nameM = block.match(/name\s*:\s*(.+)/i);
    const rawName = nameM ? nameM[1].trim() : "";
    const weekdays = {}; const warnings = [];
    days.forEach(([abbr, full], i) => {
      const re = new RegExp("^\\s*(?:" + abbr + "|" + full + ")\\s*[:.=\\-]\\s*(.*)$", "im");
      const m = block.match(re);
      if (m) { const v = normAvail(m[1]); weekdays[i] = v; if (m[1].trim() && v === null) warnings.push(`${WD_SHORT[i]}: „${m[1].trim()}“ unklar`); }
      else weekdays[i] = undefined;
    });
    const filled = Object.values(weekdays).filter((v) => v !== undefined && v !== null).length;
    if (!rawName) warnings.push("Kein Name erkannt");
    if (filled < 7) warnings.push(`${7 - filled} Tag(e) fehlen`);
    const emp = rawName ? matchEmployee(rawName) : null;
    if (rawName && !emp) warnings.push("Nicht zugeordnet");
    return { rawName, emp, weekdays, warnings, _filled: filled };
  }).filter((p) => p.rawName || p._filled > 0);
}

const AV_LABEL = { yes: "ganz", no: "nicht", vm: "vm", nm: "nm" };

function renderAvailability() {
  const today = new Date(state.boot.today + "T00:00:00");
  const nm = mondayOf(today); nm.setDate(nm.getDate() + 7);
  const startDefault = `${nm.getFullYear()}-${pad(nm.getMonth() + 1)}-${pad(nm.getDate())}`;

  $("#content").innerHTML = `<div class="avail-page">
    <div>
      <h1 style="font-size:var(--text-xl);font-weight:var(--fw-semi);letter-spacing:-0.01em">Verfügbarkeit</h1>
      <p class="setup-intro">Mitarbeiter füllen eine feste Vorlage aus (einfacher Text in der E-Mail). Die App liest sie direkt ein — ohne KI, ohne Kosten. Zuerst den Zeitraum wählen.</p>
    </div>

    <div class="avail-period">
      <div class="field"><label>Ab Kalenderwoche (Montag)</label><input type="date" class="control" id="av-start" value="${startDefault}"></div>
      <div class="field"><label>Anzahl Wochen</label><input type="number" class="control" id="av-count" value="4" min="1" max="12" style="width:90px"></div>
      <div class="field" style="flex:1"><label>Zeitraum</label><div class="control" id="av-periodlabel" style="background:var(--surface-3);border-style:dashed">…</div></div>
    </div>

    <div class="avail-card">
      <h2><span class="step-num">1</span> Vorlage an die Mitarbeiter</h2>
      <p>Erzeuge die Vorlage und schicke sie an das Team. Der Zeitraum ist schon eingetragen, die Leute füllen nur Mo–So aus.</p>
      <div class="avail-actions">
        <button class="btn" data-av="gen-empty">Leere Vorlage</button>
        <button class="btn" data-av="gen-per">Pro Mitarbeiter (Name vorausgefüllt)</button>
        <button class="btn btn--sm btn--ghost" data-av="copy-template">${icon("copy")}<span>Kopieren</span></button>
      </div>
      <textarea class="control avail-ta" id="av-template" readonly placeholder="Hier erscheint die Vorlage zum Kopieren …"></textarea>
    </div>

    <div class="avail-card">
      <h2><span class="step-num">2</span> Antworten auswerten</h2>
      <p>Füge die ausgefüllten Antworten hier ein (auch mehrere auf einmal). Danach prüfst du die Vorschau und übernimmst sie in die Wochen.</p>
      <textarea class="control avail-ta" id="av-paste" placeholder="Antworten der Mitarbeiter hier einfügen …"></textarea>
      <div class="avail-actions">
        <button class="btn btn--primary" data-av="parse">Auswerten</button>
        <button class="btn btn--sm btn--ghost" data-av="gemini">${icon("copy")}<span>Passt nicht ins Format? Gemini-Prompt kopieren</span></button>
      </div>
      <div class="avail-preview" id="av-preview"></div>
    </div>
  </div>`;
  renderTopbar();

  const updateLabel = () => { try { $("#av-periodlabel").textContent = periodLabel(currentAvailWeeks()); } catch (e) {} };
  updateLabel();
  $("#av-start").addEventListener("input", updateLabel);
  $("#av-count").addEventListener("input", updateLabel);

  $(".avail-page").addEventListener("click", (e) => {
    const b = e.target.closest("[data-av]"); if (!b) return;
    const act = b.dataset.av;
    if (act === "gen-empty") { $("#av-template").value = buildTemplate(currentAvailWeeks(), ""); }
    else if (act === "gen-per") {
      const weeks = currentAvailWeeks();
      const emps = state.boot.employees.filter((x) => x.active !== 0);
      $("#av-template").value = emps.map((x) => buildTemplate(weeks, x.name)).join("\n\n");
    }
    else if (act === "copy-template") { const t = $("#av-template").value; if (t) copyText(t); else toast("Erst eine Vorlage erzeugen", "info"); }
    else if (act === "parse") doParseResponses();
    else if (act === "gemini") copyText(geminiPrompt(currentAvailWeeks()));
    else if (act === "apply") applyAvailability();
  });
}

function doParseResponses() {
  const text = $("#av-paste").value.trim();
  if (!text) { toast("Bitte zuerst Antworten einfügen", "info"); return; }
  availState.weeks = currentAvailWeeks();
  availState.parsed = parseResponses(text);
  const emps = state.boot.employees.filter((e) => e.active !== 0);
  const rows = availState.parsed.map((p, idx) => {
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const v = p.weekdays[i];
      cells.push(`<td>${v ? `<span class="av-cell av-${v}">${AV_LABEL[v]}</span>` : `<span class="av-warn">—</span>`}</td>`);
    }
    const opts = `<option value="">— nicht zuordnen —</option>` + emps.map((e) => `<option value="${e.id}" ${p.emp && e.id === p.emp.id ? "selected" : ""}>${esc(e.kuerzel)} · ${esc(e.name)}</option>`).join("");
    const warn = p.warnings.length ? `<span class="av-warn">${esc(p.warnings.join(" · "))}</span>` : `<span style="color:var(--success)">ok</span>`;
    return `<tr>
      <td class="name"><div style="font-size:var(--text-xs);color:var(--ink-faint)">gelesen: ${esc(p.rawName || "?")}</div>
        <select class="control control--sm avail-map" data-map="${idx}">${opts}</select></td>
      ${cells.join("")}
      <td class="name">${warn}</td>
    </tr>`;
  }).join("");

  $("#av-preview").innerHTML = `
    <table class="avail-table">
      <thead><tr><th>Mitarbeiter (Zuordnung)</th>${WD_SHORT.map((d) => `<th>${d}</th>`).join("")}<th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="avail-actions" style="margin-top:var(--sp-3)">
      <button class="btn btn--primary" data-av="apply">In ${periodLabel(availState.weeks).split("  ")[0]} übernehmen</button>
      <span class="setup-intro" style="margin:0">Schreibt die Verfügbarkeit in ${availState.weeks.length} Woche(n). Bestehende Einträge dieser Wochen werden pro Tag überschrieben.</span>
    </div>`;
}

async function applyAvailability() {
  const rows = [...document.querySelectorAll("#av-preview tbody tr")];
  const entries = []; let people = 0;
  rows.forEach((tr) => {
    const sel = tr.querySelector("[data-map]"); const empId = sel.value ? +sel.value : null;
    if (!empId) return;
    const wd = availState.parsed[+sel.dataset.map].weekdays;
    let any = false;
    availState.weeks.forEach((w) => {
      for (let i = 0; i < 7; i++) { const mode = wd[i]; if (mode === null || mode === undefined) continue; entries.push({ employee_id: empId, iso_year: w.year, iso_week: w.week, weekday: i, mode }); any = true; }
    });
    if (any) people++;
  });
  if (!entries.length) { toast("Nichts zu übernehmen (keine Zuordnung/Werte)", "error"); return; }
  try {
    const r = await API.applyAvailability(entries);
    toast(`Übernommen: ${people} Mitarbeiter · ${r.applied} Einträge`, "success");
  } catch (e) { toast(e.message, "error"); }
}

function geminiPrompt(weeks) {
  return `Du bekommst unten eine formlose E-Mail eines Mitarbeiters über seine Arbeits-Verfügbarkeit.
Wandle sie in GENAU dieses Format um und antworte NUR mit dem ausgefüllten Block, sonst nichts.
Erlaubte Werte je Tag: ganz / vormittags / nachmittags / nicht. Wenn ein Tag nicht genannt wird, schreibe "ganz".

${buildTemplate(weeks, "")}

E-Mail:
<hier die E-Mail einfügen>`;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast("In die Zwischenablage kopiert", "success"); }
  catch (e) {
    const ta = $("#av-template") || $("#av-paste");
    toast("Kopieren nicht erlaubt — bitte den Text manuell markieren", "info");
  }
}

/* =======================================================================
   Wochen-Setup: Abwesenheiten, Kurse, Sonderaufgaben
   ======================================================================= */
async function refreshWeek() {
  const { year, week } = isoWeek(state.monday);
  const prev = state.week?._plan;
  state.week = await API.week(state.locId, year, week);
  if (prev) state.week._plan = prev;
  render(); renderTopbar();
}

function fmtDay(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${WD_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()}.${d.getMonth() + 1}.`;
}

function renderSetup() {
  const wk = state.week;
  const absCat = catalog("absence_types");
  const ctCat = catalog("course_types");
  const roomById = {}; state.boot.rooms.forEach((r) => (roomById[r.id] = r));

  const setupRow = (kind, id, color, tag, title, meta) => `
    <div class="setup-row">
      <span class="setup-row__tag" style="color:${color};border-color:color-mix(in oklab,${color} 50%,var(--line));background:color-mix(in oklab,${color} 12%,transparent)">${esc(tag)}</span>
      <div class="setup-row__main"><div class="setup-row__title">${esc(title)}</div><div class="setup-row__meta">${esc(meta)}</div></div>
      <div class="setup-row__actions">
        <button class="btn btn--sm btn--ghost" data-edit="${kind}:${id}">Bearbeiten</button>
        <button class="btn btn--sm btn--ghost" data-del="${kind}:${id}" title="Löschen">✕</button>
      </div>
    </div>`;
  const empty = (t) => `<div class="setup-empty">${esc(t)}</div>`;
  const section = (title, desc, addKey, rows) => `
    <section class="setup-sec">
      <div class="setup-sec__head">
        <div><div class="setup-sec__title">${esc(title)}</div><div class="setup-sec__desc">${esc(desc)}</div></div>
        <div class="setup-sec__spacer"></div>
        <button class="btn btn--sm" data-add="${addKey}">+ Hinzufügen</button>
      </div>
      <div class="setup-list">${rows}</div>
    </section>`;

  const absRows = (wk.absences || []).map((a) => {
    const e = state.empById[a.employee_id]; const t = absCat[a.type] || { label: a.type, color: "#8894a2" };
    const when = a.date ? (a.end_date ? `${fmtDay(a.date)}–${fmtDay(a.end_date)}` : fmtDay(a.date)) : "ganze Woche";
    const per = a.period && a.period !== "ganztags" ? " · " + a.period : "";
    const prio = a.priority === "wunsch" ? " · Wunsch" : "";
    return setupRow("abs", a.id, t.color, t.label, `${e?.kuerzel || "?"} — ${e?.name || ""}`, when + per + prio);
  }).join("") || empty("Keine Abwesenheiten oder Wünsche in dieser Woche.");

  const courseRows = (wk.courses || []).map((c) => {
    const t = ctCat[c.type] || { label: c.type, color: "#8894a2" };
    const room = c.room_id ? " · " + (roomById[c.room_id]?.name || "") : "";
    const staff = c.staff_needed ? ` · ${c.staff_needed} Pers.${c.role_required ? " (" + c.role_required + ")" : ""}` : " · ohne Personal";
    return setupRow("course", c.id, t.color, t.label, c.title || "Kurs", `${fmtDay(c.date)} ${c.start_time || ""}–${c.end_time || ""}${room}${staff}`);
  }).join("") || empty("Keine Kurse in dieser Woche.");

  const taskRows = (wk.tasks || []).map((t) => {
    const room = t.room_id ? " · " + (roomById[t.room_id]?.name || "") : "";
    const staff = ` · ${t.staff_needed || 1} Pers.${t.role_required ? " (" + t.role_required + ")" : ""}`;
    return setupRow("task", t.id, "#C99A2E", "zbV", t.title || "Aufgabe", `${fmtDay(t.date)} ${t.start_time || ""}–${t.end_time || ""}${room}${staff}`);
  }).join("") || empty("Keine Sonderaufgaben in dieser Woche.");

  $("#content").innerHTML = `<div class="setup-page">
    <div>
      <h1 style="font-size:var(--text-xl);font-weight:var(--fw-semi);letter-spacing:-0.01em">Wochen-Setup</h1>
      <p class="setup-intro">Alles, was in dieser Woche vom Normalfall abweicht. Der Auto-Plan berücksichtigt es automatisch — der Rest läuft über Standard-Verfügbarkeit und Grundbesetzung.</p>
    </div>
    ${section("Abwesenheiten & Wünsche", "Urlaub, Krank, Frei, Wunsch-frei — füllt das Ganztags-Band im Kalender", "addabs", absRows)}
    ${section("Kurse", "Präsenz deckt die Grundlast ab · Hybrid/Online bekommen eigenes Personal", "addcourse", courseRows)}
    ${section("Sonderaufgaben (zbV)", "z. B. „umbauen Raum 2+3\" — wird als Bedarf mit Personal besetzt", "addtask", taskRows)}
  </div>`;
  renderTopbar();

  $(".setup-page").addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]"); const ed = e.target.closest("[data-edit]"); const del = e.target.closest("[data-del]");
    if (add) { const k = add.dataset.add; if (k === "addabs") openAbsenceEditor(null); else if (k === "addcourse") openCourseEditor(null); else if (k === "addtask") openTaskEditor(null); }
    else if (ed) { const [k, id] = ed.dataset.edit.split(":"); openSetupItem(k, +id); }
    else if (del) { const [k, id] = del.dataset.del.split(":"); deleteSetupItem(k, +id); }
  });
}

function openSetupItem(k, id) {
  if (k === "abs") openAbsenceEditor((state.week.absences || []).find((x) => x.id === id));
  else if (k === "course") openCourseEditor((state.week.courses || []).find((x) => x.id === id));
  else if (k === "task") openTaskEditor((state.week.tasks || []).find((x) => x.id === id));
}
async function deleteSetupItem(k, id) {
  const table = k === "abs" ? "absences" : k === "course" ? "courses" : "tasks";
  try { await API.remove(table, id); await refreshWeek(); toast("Gelöscht", "success"); }
  catch (e) { toast(e.message, "error"); }
}

function openAbsenceEditor(a) {
  const isNew = !a;
  const emps = state.boot.employees.filter((e) => e.location_id === state.locId && e.active !== 0);
  const types = state.boot.settings.absence_types || [];
  const dates = state.week.dates;
  a = a || { employee_id: emps[0]?.id, type: types[0]?.id, period: "ganztags", priority: "fix", date: null };
  const wholeWeek = !a.date;
  const body = `
    <div class="field"><label>Mitarbeiter</label><select class="control" id="a-emp">${emps.map((e) => `<option value="${e.id}" ${e.id === a.employee_id ? "selected" : ""}>${esc(e.kuerzel)} · ${esc(e.name)}</option>`).join("")}</select></div>
    <div class="field-row">
      <div class="field"><label>Art</label><select class="control" id="a-type">${types.map((t) => `<option value="${t.id}" ${t.id === a.type ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></div>
      <div class="field"><label>Zeitraum am Tag</label><select class="control" id="a-period">${[["ganztags", "Ganztags"], ["vm", "Vormittags"], ["nm", "Nachmittags"]].map(([v, l]) => `<option value="${v}" ${a.period === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    </div>
    <label class="check"><input type="checkbox" id="a-week" ${wholeWeek ? "checked" : ""}> Ganze Woche</label>
    <div class="field-row">
      <div class="field"><label>Von Tag</label><input type="date" class="control" id="a-date" value="${esc(a.date || dates[0])}" min="${dates[0]}" max="${dates[6]}"></div>
      <div class="field"><label>Bis Tag (optional)</label><input type="date" class="control" id="a-end" value="${esc(a.end_date || "")}" min="${dates[0]}" max="${dates[6]}"></div>
    </div>
    <div class="field"><label>Priorität</label><div class="seg" id="a-prio">
      <button type="button" data-p="fix" class="${a.priority !== "wunsch" ? "is-on" : ""}">Fix (unantastbar)</button>
      <button type="button" data-p="wunsch" class="${a.priority === "wunsch" ? "is-on" : ""}">Wunsch</button>
    </div></div>
    <div class="field"><label>Notiz</label><input class="control" id="a-note" value="${esc(a.note || "")}"></div>
  `;
  const footer = `${isNew ? "" : `<button class="btn" data-del style="color:var(--danger);border-color:color-mix(in oklab,var(--danger) 40%,var(--line))">Löschen</button>`}<span class="spacer"></span><button class="btn" data-close>Abbrechen</button><button class="btn btn--primary" data-save>Speichern</button>`;
  const { dlg, close } = modal({ title: isNew ? "Abwesenheit / Wunsch" : "Abwesenheit bearbeiten", body, footer, width: 500 });
  dlg.querySelector("#a-prio").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (!b) return; dlg.querySelectorAll("#a-prio button").forEach((x) => x.classList.remove("is-on")); b.classList.add("is-on"); });
  dlg.querySelector("[data-save]").addEventListener("click", async () => {
    const g = (id) => dlg.querySelector(id);
    const iso = isoWeek(state.monday);
    const whole = g("#a-week").checked;
    const data = {
      employee_id: +g("#a-emp").value, iso_year: iso.year, iso_week: iso.week,
      type: g("#a-type").value, period: g("#a-period").value, priority: dlg.querySelector("#a-prio .is-on").dataset.p,
      date: whole ? null : g("#a-date").value, end_date: whole ? null : (g("#a-end").value || null),
      note: g("#a-note").value.trim() || null,
    };
    try { if (isNew) await API.create("absences", data); else await API.update("absences", a.id, data); await refreshWeek(); close(); toast("Gespeichert", "success"); }
    catch (e) { toast(e.message, "error"); }
  });
  const del = dlg.querySelector("[data-del]");
  if (del) del.addEventListener("click", async () => { try { await API.remove("absences", a.id); await refreshWeek(); close(); toast("Gelöscht", "success"); } catch (e) { toast(e.message, "error"); } });
}

function openCourseEditor(c) {
  const isNew = !c;
  const types = state.boot.settings.course_types || [];
  const rooms = state.boot.rooms.filter((r) => r.location_id === state.locId);
  const roles = state.boot.settings.roles || [];
  const dates = state.week.dates;
  c = c || { type: types[0]?.id, date: dates[0], start_time: "18:00", end_time: "20:00", staff_needed: types[0]?.default_staff || 0 };
  const body = `
    <div class="field-row">
      <div class="field"><label>Kurs-Typ</label><select class="control" id="c-type">${types.map((t) => `<option value="${t.id}" ${t.id === c.type ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></div>
      <div class="field"><label>Titel</label><input class="control" id="c-title" value="${esc(c.title || "")}" placeholder="z.B. Excel-Grundlagen"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Datum</label><input type="date" class="control" id="c-date" value="${esc(c.date)}" min="${dates[0]}" max="${dates[6]}"></div>
      <div class="field"><label>Raum (optional)</label><select class="control" id="c-room"><option value="">—</option>${rooms.map((r) => `<option value="${r.id}" ${r.id === c.room_id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Von</label><input type="time" class="control" id="c-start" value="${esc(c.start_time || "18:00")}" step="900"></div>
      <div class="field"><label>Bis</label><input type="time" class="control" id="c-end" value="${esc(c.end_time || "20:00")}" step="900"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Personalbedarf</label><input type="number" class="control" id="c-staff" value="${c.staff_needed || 0}" min="0" max="10"></div>
      <div class="field"><label>Rolle (optional)</label><select class="control" id="c-role"><option value="">—</option>${roles.map((r) => `<option ${r === c.role_required ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></div>
    </div>
    <p style="color:var(--ink-faint);font-size:var(--text-xs)">Präsenz wird i. d. R. von der Grundbesetzung betreut (Bedarf 0). Hybrid/Online bekommen eigenes Personal (Bedarf ≥ 1).</p>
  `;
  const footer = `${isNew ? "" : `<button class="btn" data-del style="color:var(--danger);border-color:color-mix(in oklab,var(--danger) 40%,var(--line))">Löschen</button>`}<span class="spacer"></span><button class="btn" data-close>Abbrechen</button><button class="btn btn--primary" data-save>Speichern</button>`;
  const { dlg, close } = modal({ title: isNew ? "Neuer Kurs" : "Kurs bearbeiten", body, footer, width: 520 });
  dlg.querySelector("[data-save]").addEventListener("click", async () => {
    const g = (id) => dlg.querySelector(id);
    const iso = isoWeek(new Date(g("#c-date").value + "T00:00:00"));
    const data = {
      location_id: state.locId, iso_year: iso.year, iso_week: iso.week, date: g("#c-date").value,
      type: g("#c-type").value, title: g("#c-title").value.trim() || null,
      start_time: g("#c-start").value, end_time: g("#c-end").value,
      room_id: g("#c-room").value ? +g("#c-room").value : null,
      staff_needed: +g("#c-staff").value || 0, role_required: g("#c-role").value || null,
    };
    try { if (isNew) await API.create("courses", data); else await API.update("courses", c.id, data); await refreshWeek(); close(); toast("Kurs gespeichert", "success"); }
    catch (e) { toast(e.message, "error"); }
  });
  const del = dlg.querySelector("[data-del]");
  if (del) del.addEventListener("click", async () => { try { await API.remove("courses", c.id); await refreshWeek(); close(); toast("Kurs gelöscht", "success"); } catch (e) { toast(e.message, "error"); } });
}

function openTaskEditor(t) {
  const isNew = !t;
  const rooms = state.boot.rooms.filter((r) => r.location_id === state.locId);
  const roles = state.boot.settings.roles || [];
  const dates = state.week.dates;
  t = t || { date: dates[0], start_time: "14:00", end_time: "17:00", staff_needed: 1 };
  const body = `
    <div class="field"><label>Titel / Aufgabe</label><input class="control" id="t-title" value="${esc(t.title || "")}" placeholder="z.B. umbauen Raum 2+3"></div>
    <div class="field-row">
      <div class="field"><label>Datum</label><input type="date" class="control" id="t-date" value="${esc(t.date)}" min="${dates[0]}" max="${dates[6]}"></div>
      <div class="field"><label>Raum (optional)</label><select class="control" id="t-room"><option value="">—</option>${rooms.map((r) => `<option value="${r.id}" ${r.id === t.room_id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Von</label><input type="time" class="control" id="t-start" value="${esc(t.start_time || "14:00")}" step="900"></div>
      <div class="field"><label>Bis</label><input type="time" class="control" id="t-end" value="${esc(t.end_time || "17:00")}" step="900"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Personalbedarf</label><input type="number" class="control" id="t-staff" value="${t.staff_needed || 1}" min="1" max="10"></div>
      <div class="field"><label>Rolle (optional)</label><select class="control" id="t-role"><option value="">—</option>${roles.map((r) => `<option ${r === t.role_required ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></div>
    </div>
  `;
  const footer = `${isNew ? "" : `<button class="btn" data-del style="color:var(--danger);border-color:color-mix(in oklab,var(--danger) 40%,var(--line))">Löschen</button>`}<span class="spacer"></span><button class="btn" data-close>Abbrechen</button><button class="btn btn--primary" data-save>Speichern</button>`;
  const { dlg, close } = modal({ title: isNew ? "Neue Sonderaufgabe" : "Sonderaufgabe bearbeiten", body, footer, width: 520 });
  dlg.querySelector("[data-save]").addEventListener("click", async () => {
    const g = (id) => dlg.querySelector(id);
    const iso = isoWeek(new Date(g("#t-date").value + "T00:00:00"));
    const data = {
      location_id: state.locId, iso_year: iso.year, iso_week: iso.week, date: g("#t-date").value,
      title: g("#t-title").value.trim() || null, start_time: g("#t-start").value, end_time: g("#t-end").value,
      room_id: g("#t-room").value ? +g("#t-room").value : null,
      staff_needed: +g("#t-staff").value || 1, role_required: g("#t-role").value || null,
    };
    try { if (isNew) await API.create("tasks", data); else await API.update("tasks", t.id, data); await refreshWeek(); close(); toast("Aufgabe gespeichert", "success"); }
    catch (e) { toast(e.message, "error"); }
  });
  const del = dlg.querySelector("[data-del]");
  if (del) del.addEventListener("click", async () => { try { await API.remove("tasks", t.id); await refreshWeek(); close(); toast("Aufgabe gelöscht", "success"); } catch (e) { toast(e.message, "error"); } });
}

/* =======================================================================
   Schicht-Editor (manuelle Kontrolle)
   ======================================================================= */
function openShiftEditor(a) {
  const isNew = !a.id;
  const emps = state.boot.employees.filter((e) => e.location_id === state.locId && e.active !== 0);
  const rooms = state.boot.rooms.filter((r) => r.location_id === state.locId);
  const kinds = state.boot.settings.shift_kinds || [];
  const wm = a.work_mode || "onsite";
  const empId = a.employee_id || emps[0]?.id;
  const kind = a.kind || "dienst";
  const roomId = a.room_id || "";
  const locked = a.id ? a.locked : 1;
  const dates = state.week.dates;

  const body = `
    <div class="field"><label>Mitarbeiter</label>
      <select class="control" id="s-emp">${emps.map((e) => `<option value="${e.id}" ${e.id === empId ? "selected" : ""}>${esc(e.kuerzel)} · ${esc(e.name)}</option>`).join("")}</select></div>
    <div class="field-row">
      <div class="field"><label>Art</label><select class="control" id="s-kind">${kinds.map((k) => `<option value="${k.id}" ${k.id === kind ? "selected" : ""}>${esc(k.label)}</option>`).join("")}</select></div>
      <div class="field"><label>Datum</label><input type="date" class="control" id="s-date" value="${esc(a.date)}" min="${dates[0]}" max="${dates[6]}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Von</label><input type="time" class="control" id="s-start" value="${esc(a.start_time || "08:00")}" step="900"></div>
      <div class="field"><label>Bis</label><input type="time" class="control" id="s-end" value="${esc(a.end_time || "16:00")}" step="900"></div>
    </div>
    <div class="field"><label>Arbeitsort</label>
      <div class="seg" id="s-mode">
        <button type="button" data-mode="onsite" class="${wm === "onsite" ? "is-on" : ""}">${icon("users")}Vor Ort</button>
        <button type="button" data-mode="home" class="${wm === "home" ? "is-on" : ""}">${icon("home")}Homeoffice</button>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Raum (optional)</label><select class="control" id="s-room"><option value="">—</option>${rooms.map((r) => `<option value="${r.id}" ${r.id === roomId ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Aufgabe / Notiz</label><input class="control" id="s-task" value="${esc(a.task_text || "")}" placeholder="z.B. umbauen Raum 2+3"></div>
    </div>
    <label class="check"><input type="checkbox" id="s-lock" ${locked ? "checked" : ""}> Fixieren (Auto-Plan lässt diese Schicht unangetastet)</label>
  `;
  const footer = `${isNew ? "" : `<button class="btn" data-del style="color:var(--danger);border-color:color-mix(in oklab,var(--danger) 40%,var(--line))">Löschen</button>`}<span class="spacer"></span><button class="btn" data-close>Abbrechen</button><button class="btn btn--primary" data-save>Speichern</button>`;
  const emp0 = state.empById[empId];
  const { dlg, close } = modal({ title: isNew ? "Neue Schicht" : "Schicht bearbeiten", dotColor: emp0?.color, body, footer, width: 500 });

  dlg.querySelector("#s-mode").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    dlg.querySelectorAll("#s-mode button").forEach((x) => x.classList.remove("is-on"));
    b.classList.add("is-on");
  });

  dlg.querySelector("[data-save]").addEventListener("click", async () => {
    const g = (id) => dlg.querySelector(id);
    const date = g("#s-date").value;
    const st = g("#s-start").value, en = g("#s-end").value;
    if (!date || !st || !en) { toast("Datum und Zeiten angeben", "error"); return; }
    if (en <= st) { toast("Ende muss nach Beginn liegen", "error"); return; }
    const iso = isoWeek(new Date(date + "T00:00:00"));
    const data = {
      location_id: state.locId, iso_year: iso.year, iso_week: iso.week,
      employee_id: +g("#s-emp").value, date, start_time: st, end_time: en,
      kind: g("#s-kind").value, work_mode: dlg.querySelector("#s-mode .is-on").dataset.mode,
      room_id: g("#s-room").value ? +g("#s-room").value : null,
      task_text: g("#s-task").value.trim() || null,
      course_id: a.course_id || null, status_type: a.status_type || null,
      locked: g("#s-lock").checked ? 1 : 0, auto_generated: 0,
    };
    try {
      if (isNew) await API.create("assignments", data); else await API.update("assignments", a.id, data);
      await refreshCalendar(); close(); toast("Schicht gespeichert", "success");
    } catch (e) { toast(e.message, "error"); }
  });
  const del = dlg.querySelector("[data-del]");
  if (del) del.addEventListener("click", async () => {
    try { await API.remove("assignments", a.id); await refreshCalendar(); close(); toast("Schicht gelöscht", "success"); }
    catch (e) { toast(e.message, "error"); }
  });
}

/* =======================================================================
   Stammdaten: Team & Standorte (Zuordnung ist das Fundament)
   ======================================================================= */
const WD_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const PALETTE = ["#2E7D5B", "#3B6FB0", "#C99A2E", "#7A5AA6", "#2E8B7F", "#B5654B", "#4A6FA5", "#5A5F6A", "#8E44AD", "#16A085", "#2F5D8A", "#A1553D"];
const randomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];

async function refreshBoot() {
  state.boot = await API.bootstrap();
  state.empById = {};
  state.boot.employees.forEach((e) => (state.empById[e.id] = e));
  if (!state.boot.locations.some((l) => l.id === state.locId))
    state.locId = state.boot.locations[0]?.id || null;
}

function modal({ title, dotColor, body, footer, width }) {
  const dlg = document.createElement("dialog");
  dlg.className = "modal";
  if (width) dlg.style.width = `min(${width}px, 94vw)`;
  dlg.innerHTML = `
    <div class="modal__head">
      <div class="modal__title">${dotColor ? `<span class="loc__dot" style="background:${esc(dotColor)}"></span>` : ""}${esc(title)}</div>
      <button class="btn btn--icon btn--ghost" data-close>✕</button>
    </div>
    <div class="modal__body">${body}</div>
    <div class="modal__foot">${footer}</div>`;
  document.body.appendChild(dlg);
  const close = () => { try { dlg.close(); } catch (e) {} dlg.remove(); };
  dlg.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  dlg.showModal();
  return { dlg, close };
}

function renderStaff() {
  const locs = state.boot.locations;
  const emps = state.boot.employees.filter((e) => e.active !== 0);
  const unassigned = emps.filter((e) => !locs.some((l) => l.id === e.location_id));

  const sections = locs.map((l) => {
    const team = emps.filter((e) => e.location_id === l.id).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const cards = team.length
      ? team.map((e) => empCardHtml(e, locs)).join("")
      : `<div class="staff-empty">Noch kein Team an diesem Standort.</div>`;
    return `<section class="staff-loc">
      <div class="staff-loc__head">
        <span class="staff-loc__dot" style="background:${esc(l.color)}"></span>
        <span class="staff-loc__name">${esc(l.name)}</span>
        <span class="staff-loc__bl">${esc(l.bundesland || "")}</span>
        <span class="staff-loc__count">${team.length} MA</span>
        ${team.length ? "" : `<span class="staff-loc__warn">${icon("alert")} ohne Team</span>`}
        <span class="staff-loc__spacer"></span>
        <button class="btn btn--sm btn--ghost" data-editloc="${l.id}">Standort bearbeiten</button>
        <button class="btn btn--sm" data-addemp="${l.id}">+ Mitarbeiter</button>
      </div>
      <div class="staff-grid">${cards}</div>
    </section>`;
  }).join("");

  $("#content").innerHTML = `<div class="staff-page">
    <div class="staff-head">
      <h1>Stammdaten · Team &amp; Standorte</h1>
      <div class="staff-head__actions">
        <button class="btn" data-addloc>${icon("layers")}<span>Standort</span></button>
        <button class="btn btn--primary" data-addemp="${state.locId || locs[0]?.id || ""}">${icon("users")}<span>Mitarbeiter</span></button>
      </div>
    </div>
    <p class="staff-hint"><b>Fundament der Planung:</b> Jeder Mitarbeiter ist <b>fest einem Standort</b> zugeordnet und wird nur dort verplant. Prüfe hier, dass alle richtig eingeteilt sind — den Standort änderst du direkt im Auswahlfeld jeder Person.</p>
    ${unassigned.length ? `<p class="staff-loc__warn" style="margin-bottom:var(--sp-4)">${icon("alert")} ${unassigned.length} Mitarbeiter ohne gültigen Standort</p>` : ""}
    ${sections}
  </div>`;
  renderTopbar();

  const page = $(".staff-page");
  page.addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-move]"); if (!sel) return;
    try { await API.update("employees", +sel.dataset.move, { location_id: +sel.value }); await refreshBoot(); renderStaff(); toast("Standort geändert", "success"); }
    catch (err) { toast(err.message, "error"); }
  });
  page.addEventListener("click", (e) => {
    const ed = e.target.closest("[data-edit]");
    const ae = e.target.closest("[data-addemp]");
    const el = e.target.closest("[data-editloc]");
    const al = e.target.closest("[data-addloc]");
    if (ed) openEmployeeEditor(state.empById[+ed.dataset.edit]);
    else if (ae) openEmployeeEditor(null, +ae.dataset.addemp);
    else if (el) openLocationEditor(state.boot.locations.find((l) => l.id === +el.dataset.editloc));
    else if (al) openLocationEditor(null);
  });
}

function empCardHtml(e, locs) {
  const badges = [];
  if (e.employment_type === "Azubi") badges.push("Azubi");
  if (e.can_open_close) badges.push("Schließt");
  if (e.can_home_office) badges.push("Home");
  const badgeHtml = badges.map((b) => `<span class="emp-badge">${esc(b)}</span>`).join("");
  return `<div class="emp-card" data-id="${e.id}">
    <span class="emp-card__color" style="background:${esc(e.color)}"></span>
    <div class="emp-card__main">
      <div class="emp-card__name">${esc(e.name)}<span class="emp-card__kz">${esc(e.kuerzel || "")}</span><span class="emp-card__badges">${badgeHtml}</span></div>
      <div class="emp-card__meta">${esc(e.employment_type || "")} · ${e.weekly_hours || 0} h</div>
    </div>
    <select class="control control--sm emp-card__loc" data-move="${e.id}" title="Standort ändern">
      ${locs.map((l) => `<option value="${l.id}" ${l.id === e.location_id ? "selected" : ""}>${esc(l.kuerzel || l.name)}</option>`).join("")}
    </select>
    <button class="btn btn--sm btn--ghost" data-edit="${e.id}">Bearbeiten</button>
  </div>`;
}

function openEmployeeEditor(emp, presetLoc) {
  const isNew = !emp;
  const empTypes = state.boot.settings.employment_types || ["Vollzeit"];
  emp = emp || {
    location_id: presetLoc || state.locId || state.boot.locations[0].id,
    employment_type: empTypes[0], weekly_hours: 40, color: randomColor(),
    availability: {}, school: [], roles: [], can_work_alone: 1, can_open_close: 0, can_home_office: 0, max_hours_day: 10,
  };
  const locs = state.boot.locations;
  const roles = state.boot.settings.roles || [];
  const avail = emp.availability || {};
  const schoolMap = {}; (emp.school || []).forEach((s) => (schoolMap[s.weekday] = s.period));

  const wdAvail = WD_SHORT.map((d, i) => `<div class="wd-grid__cell"><span class="wd-grid__day">${d}</span>
    <select class="control" data-avail="${i}">
      ${[["yes", "Ja"], ["no", "—"], ["vm", "vm"], ["nm", "nm"]].map(([v, l]) => `<option value="${v}" ${(avail[i] || "yes") === v ? "selected" : ""}>${l}</option>`).join("")}
    </select></div>`).join("");
  const wdSchool = WD_SHORT.map((d, i) => `<div class="wd-grid__cell"><span class="wd-grid__day">${d}</span>
    <select class="control" data-school="${i}">
      ${[["", "—"], ["vm", "vm"], ["nm", "nm"], ["ganztags", "ganz"]].map(([v, l]) => `<option value="${v}" ${(schoolMap[i] || "") === v ? "selected" : ""}>${l}</option>`).join("")}
    </select></div>`).join("");
  const roleChips = roles.map((r) => `<label class="role-chip"><input type="checkbox" data-role value="${esc(r)}" ${(emp.roles || []).includes(r) ? "checked" : ""}>${esc(r)}</label>`).join("");

  const body = `
    <div class="field-row">
      <div class="field"><label>Name</label><input class="control" id="f-name" value="${esc(emp.name || "")}" placeholder="Vor- und Nachname"></div>
      <div class="field"><label>Kürzel</label><input class="control mono" id="f-kz" value="${esc(emp.kuerzel || "")}" maxlength="4" placeholder="NA"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Standort (fest gebunden)</label><select class="control" id="f-loc">${locs.map((l) => `<option value="${l.id}" ${l.id === emp.location_id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Farbe</label><input type="color" class="control" id="f-color" value="${esc(emp.color || "#3B6FB0")}" style="height:38px;padding:3px"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Beschäftigung</label><select class="control" id="f-type">${empTypes.map((t) => `<option ${t === emp.employment_type ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
      <div class="field"><label>Wochenstunden (Soll)</label><input type="number" class="control" id="f-hours" value="${emp.weekly_hours || 40}" min="0" max="60" step="0.5"></div>
    </div>
    <hr>
    <div class="field"><label class="section-label">Standard-Verfügbarkeit</label><div class="wd-grid">${wdAvail}</div></div>
    <div class="field"><label class="section-label">Berufsschule (feste Tage)</label><div class="wd-grid">${wdSchool}</div></div>
    <hr>
    <div class="field"><label class="section-label">Qualifikationen / Rollen</label><div class="role-grid">${roleChips || '<span style="color:var(--ink-faint)">Keine Rollen definiert.</span>'}</div></div>
    <div class="field"><label class="section-label">Berechtigungen</label><div class="flag-grid">
      <label class="check"><input type="checkbox" id="f-open" ${emp.can_open_close ? "checked" : ""}> Darf auf-/zuschließen</label>
      <label class="check"><input type="checkbox" id="f-alone" ${emp.can_work_alone ? "checked" : ""}> Darf allein arbeiten</label>
      <label class="check"><input type="checkbox" id="f-home" ${emp.can_home_office ? "checked" : ""}> Darf Homeoffice</label>
    </div></div>
    <hr>
    <div class="field-row">
      <div class="field"><label>Frühester Start</label><input type="time" class="control" id="f-early" value="${esc(emp.earliest_start || "")}"></div>
      <div class="field"><label>Spätestes Ende</label><input type="time" class="control" id="f-late" value="${esc(emp.latest_end || "")}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Max. Std/Tag</label><input type="number" class="control" id="f-maxday" value="${emp.max_hours_day || 10}" min="1" max="24" step="0.5"></div>
      <div class="field"><label>Max. Std/Woche</label><input type="number" class="control" id="f-maxweek" value="${emp.max_hours_week || ""}" min="0" max="80" step="0.5" placeholder="optional"></div>
    </div>
    <div class="field"><label>Notiz</label><textarea class="control" id="f-note" placeholder="optional">${esc(emp.note || "")}</textarea></div>
  `;
  const footer = `${isNew ? "" : `<button class="btn" data-del style="color:var(--danger);border-color:color-mix(in oklab,var(--danger) 40%,var(--line))">Löschen</button>`}<span class="spacer"></span><button class="btn" data-close>Abbrechen</button><button class="btn btn--primary" data-save>Speichern</button>`;
  const { dlg, close } = modal({ title: isNew ? "Neuer Mitarbeiter" : "Mitarbeiter bearbeiten", dotColor: emp.color, body, footer, width: 560 });

  dlg.querySelector("[data-save]").addEventListener("click", async () => {
    const g = (id) => dlg.querySelector(id);
    const availability = {}; dlg.querySelectorAll("[data-avail]").forEach((s) => (availability[s.dataset.avail] = s.value));
    const school = []; dlg.querySelectorAll("[data-school]").forEach((s) => { if (s.value) school.push({ weekday: +s.dataset.school, period: s.value }); });
    const rolesSel = [...dlg.querySelectorAll("[data-role]:checked")].map((c) => c.value);
    const data = {
      name: g("#f-name").value.trim(), kuerzel: g("#f-kz").value.trim(),
      location_id: +g("#f-loc").value, color: g("#f-color").value,
      employment_type: g("#f-type").value, weekly_hours: +g("#f-hours").value,
      availability, school, roles: rolesSel, nogo: [],
      can_open_close: g("#f-open").checked ? 1 : 0, can_work_alone: g("#f-alone").checked ? 1 : 0, can_home_office: g("#f-home").checked ? 1 : 0,
      earliest_start: g("#f-early").value || null, latest_end: g("#f-late").value || null,
      max_hours_day: +g("#f-maxday").value || 10, max_hours_week: g("#f-maxweek").value ? +g("#f-maxweek").value : null,
      note: g("#f-note").value.trim() || null, active: 1,
    };
    if (!data.name) { toast("Bitte einen Namen eingeben", "error"); return; }
    try {
      if (isNew) await API.create("employees", data); else await API.update("employees", emp.id, data);
      await refreshBoot(); close(); render(); toast("Mitarbeiter gespeichert", "success");
    } catch (e) { toast(e.message, "error"); }
  });
  const del = dlg.querySelector("[data-del]");
  if (del) del.addEventListener("click", async () => {
    if (!confirm(`${emp.name} wirklich löschen?`)) return;
    try { await API.remove("employees", emp.id); await refreshBoot(); close(); render(); toast("Mitarbeiter gelöscht", "success"); }
    catch (e) { toast(e.message, "error"); }
  });
}

function openLocationEditor(loc) {
  const isNew = !loc;
  loc = loc || { color: "#2F5D8A", bundesland: "BW", open_on_holidays: 1 };
  const BL = ["BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"];
  const body = `
    <div class="field-row">
      <div class="field"><label>Name</label><input class="control" id="l-name" value="${esc(loc.name || "")}" placeholder="z.B. Bodensee (Konstanz)"></div>
      <div class="field"><label>Kürzel</label><input class="control mono" id="l-kz" value="${esc(loc.kuerzel || "")}" maxlength="4"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Bundesland (Feiertage)</label><select class="control" id="l-bl">${BL.map((b) => `<option ${b === loc.bundesland ? "selected" : ""}>${b}</option>`).join("")}</select></div>
      <div class="field"><label>Farbe</label><input type="color" class="control" id="l-color" value="${esc(loc.color || "#2F5D8A")}" style="height:38px;padding:3px"></div>
    </div>
    <label class="check"><input type="checkbox" id="l-hol" ${loc.open_on_holidays ? "checked" : ""}> An Feiertagen grundsätzlich geöffnet</label>
    ${isNew ? `<p style="color:var(--ink-muted);font-size:var(--text-sm)">Räume, Betriebszeiten (Mo–Fr 08–18) und Grundbesetzung werden mit sinnvollen Voreinstellungen angelegt und sind später frei änderbar.</p>` : ""}
  `;
  const footer = `${isNew ? "" : `<button class="btn" data-del style="color:var(--danger);border-color:color-mix(in oklab,var(--danger) 40%,var(--line))">Löschen</button>`}<span class="spacer"></span><button class="btn" data-close>Abbrechen</button><button class="btn btn--primary" data-save>Speichern</button>`;
  const { dlg, close } = modal({ title: isNew ? "Neuer Standort" : "Standort bearbeiten", dotColor: loc.color, body, footer, width: 480 });

  dlg.querySelector("[data-save]").addEventListener("click", async () => {
    const data = {
      name: dlg.querySelector("#l-name").value.trim(), kuerzel: dlg.querySelector("#l-kz").value.trim(),
      bundesland: dlg.querySelector("#l-bl").value, color: dlg.querySelector("#l-color").value,
      open_on_holidays: dlg.querySelector("#l-hol").checked ? 1 : 0,
    };
    if (!data.name) { toast("Bitte einen Namen eingeben", "error"); return; }
    try {
      if (isNew) { const created = await API.create("locations", data); await seedLocationDefaults(created.id); }
      else await API.update("locations", loc.id, data);
      await refreshBoot(); close(); renderSidebar(); render(); toast("Standort gespeichert", "success");
    } catch (e) { toast(e.message, "error"); }
  });
  const del = dlg.querySelector("[data-del]");
  if (del) del.addEventListener("click", async () => {
    const team = state.boot.employees.filter((e) => e.location_id === loc.id);
    if (team.length) { toast(`Standort hat noch ${team.length} Mitarbeiter — erst umziehen oder löschen.`, "error"); return; }
    if (!confirm(`Standort ${loc.name} löschen?`)) return;
    try { await API.remove("locations", loc.id); await refreshBoot(); close(); renderSidebar(); render(); toast("Standort gelöscht", "success"); }
    catch (e) { toast(e.message, "error"); }
  });
}

async function seedLocationDefaults(locId) {
  for (let wd = 0; wd < 7; wd++) {
    const closed = wd > 4;
    await API.create("operating_hours", { location_id: locId, weekday: wd, open_time: closed ? null : "08:00", close_time: closed ? null : "18:00", closed: closed ? 1 : 0 });
    if (!closed) {
      await API.create("coverage_blocks", { location_id: locId, weekday: wd, start_time: "08:00", end_time: "14:00", min_staff: 2 });
      await API.create("coverage_blocks", { location_id: locId, weekday: wd, start_time: "14:00", end_time: "18:00", min_staff: 1 });
    }
  }
  for (let r = 1; r <= 2; r++) await API.create("rooms", { location_id: locId, name: "Raum " + r, sort: r });
}

init();
