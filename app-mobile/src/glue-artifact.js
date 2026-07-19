/* Artifact-Glue: verbindet die App mit window.claude.mcp (Gmail + Google Drive)
   und window.claude.downloads. Ohne diese Umgebung (lokal/PWA) bleibt alles inert.

   Beobachtete Tool-Formen (echte Request/Response-Paare, Juli 2026):
     Gmail  search_threads({query,pageSize}) -> {threads:[{id,messages:[{subject,sender,snippet,date,...}]}]} | {}
     Gmail  get_thread({threadId,messageFormat:"FULL_CONTENT"}) -> {messages:[{plaintextBody,htmlBody,subject,...}]}
     Drive  search_files({query,pageSize}) -> {files:[{id,title,createdTime,...}]} | {}
     Drive  create_file({title,textContent|base64Content,contentMimeType,disableConversionToGoogleType:true}) -> {id,title,...}
     Drive  download_file_content({fileId}) -> {content:<base64>,mimeType,title}
   Fehlerbehandlung nach mcp.d.ts: pro Code eigener Hinweis, Retry nur bei retryable. */
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  if (typeof window === "undefined") return;

  const GMAIL = "Gmail";
  const DRIVE = "Google Drive";

  /* ------------------------- base64 <-> utf8/bytes -------------------- */
  function b64ToUtf8(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  function bytesToB64(bytes) {
    let bin = "";
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  const utf8ToB64 = (s) => bytesToB64(new TextEncoder().encode(s));

  /* ------------------------- Fehler-Hinweise --------------------------- */
  function errHint(e, server) {
    const s = (e && e.server) || server || "Konnektor";
    switch (e && e.code) {
      case "needs_reauth": return `${s} neu verbinden: claude.ai → Einstellungen → Konnektoren`;
      case "server_not_connected": return `${s} fehlt: in claude.ai → Einstellungen → Konnektoren hinzufügen`;
      case "selection_required": return `Mehrere ${s}-Konnektoren – bitte in der Abfrage oben einen auswählen`;
      case "server_unavailable": return `${s} gerade nicht erreichbar – später erneut versuchen`;
      case "not_in_manifest": return `${s}: Zugriff nicht freigegeben (Manifest)`;
      case "blocked_by_policy": case "approval_required": return `${s}: durch Richtlinie blockiert`;
      case "tool_error": return `${s}-Fehler: ${e.message || "Tool meldete einen Fehler"}`;
      case "not_granted": case "capability_disabled": case "capability_removed":
        return "Konnektor-Zugriff in dieser Ansicht nicht verfügbar";
      default: return `${s}: ${e && e.message ? e.message : "unbekannter Fehler"}`;
    }
  }

  async function call(server, tool, input, opts) {
    const mcp = window.claude && window.claude.mcp;
    if (!mcp) throw { code: "capability_disabled", message: "kein mcp" };
    return mcp.callTool(server, tool, input, opts);
  }
  const payload = (r) => (r && r.payload !== undefined ? r.payload : null);

  /* ------------------------- Drive-Adapter ----------------------------- */
  const driveAdapter = {
    async listNewest() {
      const r = await call(DRIVE, "search_files", {
        query: `title contains '${DP.storage.FILE_PREFIX}'`, pageSize: 25,
      }, { cache: false });
      const files = (payload(r) || {}).files || [];
      const state = files
        .filter((f) => (f.title || "").startsWith(DP.storage.FILE_PREFIX) && (f.title || "").endsWith(".json"))
        .sort((a, b) => (b.title || "").localeCompare(a.title || ""));
      if (!state.length) return null;
      const dl = await call(DRIVE, "download_file_content", { fileId: state[0].id }, { cache: false });
      const p = payload(dl) || {};
      return { name: state[0].title, content: p.content ? b64ToUtf8(p.content) : null };
    },
    async save(name, content) {
      await call(DRIVE, "create_file", {
        title: name, textContent: content,
        contentMimeType: "application/json", disableConversionToGoogleType: true,
      });
    },
  };

  /* Beliebige Export-Datei nach Drive (auch binaer, z.B. .xlsx). */
  async function uploadToDrive(filename, data, mime) {
    const input = { title: filename, contentMimeType: mime, disableConversionToGoogleType: true };
    if (data instanceof Uint8Array) input.base64Content = bytesToB64(data);
    else input.base64Content = utf8ToB64(String(data));
    const r = await call(DRIVE, "create_file", input);
    return payload(r);
  }

  /* ------------------------- Gmail-Abruf ------------------------------- */
  async function fetchAvailabilityMails() {
    const ui = DP.ui;
    const subject = (DP.storage.state.doc.settings.mail_subject || "Verfügbarkeit").split(" ")[0];
    ui.toast("Suche Mails mit Betreff „" + subject + "“ …");
    let threads;
    try {
      const r = await call(GMAIL, "search_threads", {
        query: `subject:${subject} newer_than:90d`, pageSize: 30,
      }, { cache: false });
      threads = (payload(r) || {}).threads || [];
    } catch (e) { ui.toast(errHint(e, GMAIL), "error"); return; }
    if (!threads.length) { ui.toast("Keine Mails mit diesem Betreff gefunden (letzte 90 Tage)", "info"); return; }

    ui.toast(`${threads.length} Mail(s) gefunden – lese Inhalte …`);
    const texts = [];
    for (const t of threads) {
      try {
        const r = await call(GMAIL, "get_thread", { threadId: t.id, messageFormat: "FULL_CONTENT" }, { cache: false });
        const msgs = (payload(r) || {}).messages || [];
        for (const m of msgs) {
          const body = m.plaintextBody || m.plaintext_body || m.snippet || "";
          if (/name\s*:/i.test(body)) texts.push(body);
        }
      } catch (e) { /* einzelne Mail fehlerhaft -> Rest weiterlesen */ }
    }
    if (!texts.length) { ui.toast("Mails gefunden, aber keine ausgefüllte Vorlage darin", "info"); return; }
    const ta = document.querySelector("#av-paste");
    if (ta) ta.value = texts.join("\n\n");
    ui.parseAndPreview(texts.join("\n\n"));
    ui.toast(`${texts.length} Antwort-Block/Blöcke eingelesen – bitte prüfen und übernehmen`, "success");
  }

  /* ------------------------- Aktivierung ------------------------------- */
  async function activate() {
    const mcp = window.claude && window.claude.mcp;
    if (!mcp) return; // lokal / PWA
    // Warten, bis die Oberflaeche gebaut ist (Wettlauf beim Start vermeiden)
    for (let i = 0; i < 80 && !document.querySelector(".tabs"); i++)
      await new Promise((r) => setTimeout(r, 125));
    let servers = [];
    try { servers = ((await mcp.listTools()) || {}).servers || []; }
    catch (e) { DP.ui && DP.ui.toast(errHint(e), "error"); return; }

    const names = servers.map((s) => s.server);
    const hasTool = (name, tool) => {
      const s = servers.find((x) => x.server === name);
      return !!(s && s.tools && s.tools.some((t) => t.name === tool));
    };

    const gmailOk = hasTool(GMAIL, "search_threads");
    const driveOk = hasTool(DRIVE, "search_files") && hasTool(DRIVE, "create_file");

    if (driveOk) {
      DP.storage.setDriveAdapter(driveAdapter);
      // Neuesten Drive-Stand laden und uebernehmen, wenn vorhanden
      try {
        const newest = await driveAdapter.listNewest();
        if (newest && newest.content) {
          DP.storage.importJSON(newest.content);
          DP.ui && DP.ui.toast("Stand aus Google Drive geladen (" + newest.name + ")", "success");
          DP.ui && DP.ui.render();
        }
      } catch (e) { DP.ui && DP.ui.toast(errHint(e, DRIVE), "error"); }
    }
    if (gmailOk) DP.gmail = { fetch: fetchAvailabilityMails };
    DP.drive = { enabled: driveOk, upload: uploadToDrive };

    if (!gmailOk || !driveOk) {
      const missing = [!gmailOk && GMAIL, !driveOk && DRIVE].filter(Boolean).join(" + ");
      DP.ui && DP.ui.toast(`Hinweis: ${missing} nicht verbunden (claude.ai → Einstellungen → Konnektoren). Verbunden: ${names.join(", ") || "keine"}`, "info");
    }
    DP.ui && DP.ui.render();
  }

  DP.artifact = { activate, uploadToDrive, errHint };
  // Nach dem UI-Boot aktivieren; Fehler hier duerfen den Start nie verhindern
  setTimeout(() => { activate().catch(() => {}); }, 400);
})();
