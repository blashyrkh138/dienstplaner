/* Datenmodell: ein JSON-Dokument statt SQLite.
   Tabellen -> Arrays, Feldnamen identisch zu backend/db.py (Portierung 1:1).
   JSON-Spalten (roles, availability, ...) sind hier native Objekte/Arrays. */
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});

  const TABLES = [
    "locations", "rooms", "operating_hours", "coverage_blocks", "employees",
    "week_availability", "absences", "courses", "assignments", "patterns",
    "templates", "special_days", "tasks",
  ];

  const MO = 0, DI = 1, MI = 2, DO = 3, FR = 4, SA = 5, SO = 6;

  function emptyDoc() {
    const doc = { schema: "dienstplaner-mobil-v1", settings: {}, nextId: {} };
    TABLES.forEach((t) => { doc[t] = []; doc.nextId[t] = 1; });
    return doc;
  }

  function insert(doc, table, row) {
    const id = doc.nextId[table]++;
    const rec = Object.assign({ id }, row);
    doc[table].push(rec);
    return rec;
  }

  function update(doc, table, id, patch) {
    const rec = doc[table].find((r) => r.id === id);
    if (rec) Object.assign(rec, patch);
    return rec || null;
  }

  function remove(doc, table, id) {
    const i = doc[table].findIndex((r) => r.id === id);
    if (i >= 0) { doc[table].splice(i, 1); return true; }
    return false;
  }

  const byId = (doc, table, id) => doc[table].find((r) => r.id === id) || null;
  const where = (doc, table, pred) => doc[table].filter(pred);

  /* ------------------------- Demo-Seed (aus seed.py) ------------------- */
  function defaultSettings() {
    return {
      roles: ["Trainer", "Betreuung", "Technik", "Ausbilder", "Ersthelfer", "Schliessberechtigt"],
      employment_types: ["Vollzeit", "Teilzeit", "Azubi", "Minijob"],
      absence_types: [
        { id: "urlaub", label: "Urlaub", color: "#C0392B", absent: true },
        { id: "krank", label: "Krank", color: "#8E44AD", absent: true },
        { id: "frei", label: "Frei", color: "#7F8C8D", absent: true },
        { id: "schule", label: "Berufsschule", color: "#2980B9", absent: true },
        { id: "wunsch_frei", label: "Wunsch-frei", color: "#16A085", absent: true },
        { id: "sonstiges", label: "Sonstiges", color: "#95A5A6", absent: true },
      ],
      shift_kinds: [
        { id: "dienst", label: "Dienst", color: "#3B6FB0", needs_room: false, home_ok: false, counts_hours: true },
        { id: "kurs", label: "Kurs-Betreuung", color: "#7A5AA6", needs_room: false, home_ok: false, counts_hours: true },
        { id: "telefon", label: "Telefondienst", color: "#4A9B8E", needs_room: false, home_ok: true, counts_hours: true },
        { id: "zbv", label: "zbV / Sonderaufgabe", color: "#C99A2E", needs_room: true, home_ok: false, counts_hours: true },
        { id: "event", label: "Termin", color: "#B5654B", needs_room: false, home_ok: false, counts_hours: false },
        { id: "status", label: "Status", color: "#5A5F6A", needs_room: false, home_ok: false, counts_hours: false },
      ],
      course_types: [
        { id: "praesenz", label: "Praesenz", color: "#2E7D5B", needs_room: true, needs_staff: false, default_staff: 0 },
        { id: "hybrid", label: "Hybrid", color: "#C99A2E", needs_room: true, needs_staff: true, default_staff: 1 },
        { id: "online", label: "Online", color: "#3E7CB1", needs_room: false, needs_staff: false, default_staff: 0 },
      ],
      planner: {
        fairness_weight: 0.6, wish_weight: 0.4, prefer_contiguous: true, use_previous_week: true,
        rules: {
          location_binding: "enforce", school: "enforce", absence: "enforce",
          rest_time: "warn", min_staff: "warn", max_hours_week: "warn",
          max_hours_day: "warn", azubi_not_alone: "enforce", closer_present: "warn",
        },
        breaks: { threshold1_h: 6, break1_min: 30, threshold2_h: 9, break2_min: 45 },
      },
      view: { start_hour: 7, end_hour: 20, step_minutes: 30 },
      title_format: "{kuerzel} {start} bis {end}",
      mail_subject: "Verfügbarkeit",
    };
  }

  function fullAvailability() {
    const a = {};
    for (let wd = 0; wd < 7; wd++) a[String(wd)] = "yes";
    return a;
  }

  function seedDemo(doc) {
    doc.settings = defaultSettings();

    const locations = [
      ["Bodensee (Konstanz)", "BOD", "#2F5D8A", "BW", 5, "08:00", "18:00", [MO, DI, MI, DO, FR]],
      ["Ludwigsburg", "LB", "#4A9B8E", "BW", 5, "08:00", "17:00", [MO, DI, MI, DO, FR]],
      ["Darmstadt", "DA", "#A1553D", "HE", 5, "08:00", "18:00", [MO, DI, MI, DO, FR]],
    ];
    const locIds = {};
    locations.forEach(([name, kz, color, bl, nRooms, op, cl, days], sort) => {
      const loc = insert(doc, "locations", {
        name, kuerzel: kz, color, bundesland: bl, open_on_holidays: 1,
        note: null, active: 1, sort,
      });
      locIds[kz] = loc.id;
      for (let r = 1; r <= nRooms; r++)
        insert(doc, "rooms", { location_id: loc.id, name: "Raum " + r, sort: r });
      for (let wd = 0; wd < 7; wd++) {
        const closed = !days.includes(wd);
        insert(doc, "operating_hours", {
          location_id: loc.id, weekday: wd,
          open_time: closed ? null : op, close_time: closed ? null : cl, closed: closed ? 1 : 0,
        });
      }
      days.forEach((wd) => {
        insert(doc, "coverage_blocks", { location_id: loc.id, weekday: wd, start_time: op, end_time: "14:00", min_staff: 2, role_required: null, note: null });
        insert(doc, "coverage_blocks", { location_id: loc.id, weekday: wd, start_time: "14:00", end_time: cl, min_staff: 1, role_required: null, note: null });
      });
    });

    const employees = [
      ["BOD", "Nadine Arendt", "NA", "#2E7D5B", "Vollzeit", 40, ["Trainer", "Schliessberechtigt"], 1, 1, 1, [], []],
      ["BOD", "Ilka Sorel", "IS", "#3B6FB0", "Vollzeit", 40, ["Betreuung", "Schliessberechtigt"], 1, 1, 0, [], []],
      ["BOD", "Tom Jansen", "TJ", "#5A5F6A", "Azubi", 35, ["Betreuung"], 0, 0, 1, [{ weekday: MI, period: "vm" }], []],
      ["BOD", "Mia Moll", "MM", "#C99A2E", "Teilzeit", 25, ["Betreuung"], 0, 1, 0, [], [FR]],
      ["LB", "Carla Kern", "CK", "#2E8B7F", "Vollzeit", 40, ["Trainer", "Technik", "Schliessberechtigt"], 1, 1, 1, [], []],
      ["LB", "Hanna Abt", "HA", "#7A5AA6", "Teilzeit", 30, ["Betreuung"], 1, 1, 0, [], []],
      ["DA", "Mara Jung", "MJ", "#B5654B", "Vollzeit", 40, ["Trainer", "Schliessberechtigt", "Ersthelfer"], 1, 1, 1, [], []],
      ["DA", "Miriam Roth", "MR", "#4A6FA5", "Teilzeit", 28, ["Betreuung", "Technik"], 1, 1, 1, [], []],
    ];
    employees.forEach(([lk, name, kz, color, typ, wh, roles, kzu, kalone, homeoff, school, nogo], sort) => {
      insert(doc, "employees", {
        location_id: locIds[lk], name, kuerzel: kz, color,
        employment_type: typ, weekly_hours: wh, max_hours_week: wh + 5, max_hours_day: 10,
        earliest_start: null, latest_end: null, min_rest_hours: 11, max_consecutive_days: 6,
        can_open_close: kzu, can_work_alone: kalone, can_home_office: homeoff,
        roles, availability: fullAvailability(), school, nogo,
        preferences: null, secondary_locations: null, vacation_days_total: null,
        contract_start: null, contract_end: null, note: null, active: 1, sort,
      });
    });

    return doc;
  }

  /* Migration bestehender Datenbestaende: jeder Standort hat mind. 5 Raeume. */
  function migrate(doc) {
    (doc.locations || []).forEach((l) => {
      const n = doc.rooms.filter((r) => r.location_id === l.id).length;
      for (let r = n + 1; r <= 5; r++)
        insert(doc, "rooms", { location_id: l.id, name: "Raum " + r, sort: r });
    });
    return doc;
  }

  DP.model = { TABLES, emptyDoc, insert, update, remove, byId, where, seedDemo, defaultSettings, migrate };
})();
