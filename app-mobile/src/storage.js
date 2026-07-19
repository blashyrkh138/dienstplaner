/* Speicher-Schicht mit austauschbarem Backend.
   - local : localStorage (Arbeits-Cache / Offline-Puffer). Immer aktiv.
   - drive : Google Drive via window.claude.mcp (Artifact) - Phase 4.
             JSON-Snapshots "dienstplaner-daten-<zeit>.json", neueste gewinnt.
   Merge-Regel: beim Start neuesten Drive-Stand laden, sonst localStorage,
   sonst Demo-Seed. Jede Aenderung -> localStorage sofort, Drive gedrosselt. */
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});

  const LS_KEY = "dp-doc-v1";
  const FILE_PREFIX = "dienstplaner-daten-";

  const state = {
    doc: null,
    driveEnabled: false,      // Phase 4: true, wenn mcp-Capability vorhanden
    driveStatus: "aus",       // aus | ok | fehler | laedt
    lastSavedAt: null,
    saveTimer: null,
    listeners: [],
  };

  /* ------------------------------ intern ------------------------------ */
  function nowStamp() {
    const n = new Date();
    const p = (x) => String(x).padStart(2, "0");
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}_${p(n.getHours())}-${p(n.getMinutes())}-${p(n.getSeconds())}`;
  }

  function loadLocal() {
    try {
      const raw = globalThis.localStorage && localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* kein localStorage / kaputt */ }
    return null;
  }

  function saveLocal(doc) {
    try {
      if (globalThis.localStorage) localStorage.setItem(LS_KEY, JSON.stringify(doc));
    } catch (e) { /* Speicher voll o.ae. - Drive/Export bleiben */ }
  }

  function notify() { state.listeners.forEach((fn) => { try { fn(state); } catch (e) {} }); }

  /* --------------------------- Drive (Phase 4) ------------------------ */
  // Wird in Phase 4 mit echten window.claude.mcp-Aufrufen gefuellt.
  // Schnittstelle: driveAdapter = { listNewest():Promise<{name,content}|null>,
  //                                 save(name, content):Promise<void> }
  let driveAdapter = null;
  function setDriveAdapter(adapter) {
    driveAdapter = adapter;
    state.driveEnabled = !!adapter;
    state.driveStatus = adapter ? "ok" : "aus";
    notify();
  }

  async function loadFromDrive() {
    if (!driveAdapter) return null;
    state.driveStatus = "laedt"; notify();
    try {
      const newest = await driveAdapter.listNewest();
      state.driveStatus = "ok"; notify();
      if (newest && newest.content) return JSON.parse(newest.content);
    } catch (e) {
      state.driveStatus = "fehler"; notify();
    }
    return null;
  }

  async function saveToDrive(doc) {
    if (!driveAdapter) return;
    try {
      await driveAdapter.save(FILE_PREFIX + nowStamp() + ".json", JSON.stringify(doc));
      state.driveStatus = "ok";
      state.lastSavedAt = new Date();
    } catch (e) {
      state.driveStatus = "fehler";
    }
    notify();
  }

  /* ------------------------------ API --------------------------------- */
  async function init() {
    let doc = null;
    if (state.driveEnabled) doc = await loadFromDrive();
    if (!doc) doc = loadLocal();
    if (!doc) doc = DP.model.seedDemo(DP.model.emptyDoc());
    DP.model.migrate(doc);
    state.doc = doc;
    saveLocal(doc);
    notify();
    return doc;
  }

  /** Nach jeder Aenderung aufrufen: sofort lokal, Drive gedrosselt (8s). */
  function markDirty() {
    saveLocal(state.doc);
    if (state.driveEnabled) {
      clearTimeout(state.saveTimer);
      state.saveTimer = setTimeout(() => saveToDrive(state.doc), 8000);
    }
    notify();
  }

  /** Sofort speichern (z.B. Knopf "Jetzt sichern" / vor Export). */
  async function flush() {
    saveLocal(state.doc);
    clearTimeout(state.saveTimer);
    if (state.driveEnabled) await saveToDrive(state.doc);
  }

  function exportJSON() {
    return {
      filename: FILE_PREFIX + nowStamp() + ".json",
      content: JSON.stringify(state.doc, null, 1),
    };
  }

  function importJSON(text) {
    const doc = JSON.parse(text);
    if (!doc || doc.schema !== "dienstplaner-mobil-v1") throw new Error("Unbekanntes Datei-Format");
    state.doc = doc;
    saveLocal(doc);
    notify();
    return doc;
  }

  function resetDemo() {
    state.doc = DP.model.seedDemo(DP.model.emptyDoc());
    saveLocal(state.doc);
    notify();
    return state.doc;
  }

  const onChange = (fn) => state.listeners.push(fn);

  DP.storage = {
    state, init, markDirty, flush, exportJSON, importJSON, resetDemo,
    setDriveAdapter, FILE_PREFIX,
  };
})();
