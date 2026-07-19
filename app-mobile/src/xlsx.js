/* Minimaler XLSX-Schreiber (ersetzt ExcelJS, ~4 KB statt 844 KB).
   Ein .xlsx ist ein ZIP mit Office-XML. Wir schreiben das ZIP unkomprimiert
   (Methode "store") - das akzeptieren Excel, LibreOffice und openpyxl.

   API:  DP.xlsx.build({ sheets: [ {name, cols, rows, merges, freeze} ] }) -> Uint8Array
     cols   : [{w:26}, ...]
     rows   : [{h:42, cells:[ {v, n?:true, s?:styleId} | null, ... ]}]
     merges : ["A1:H1"]
     freeze : {x:1, y:3}
   Stile ueber DP.xlsx.styles(): .get({bold,size,color,fill,border,align}) -> styleId */
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});

  const enc = (s) => new TextEncoder().encode(s);
  const xmlEsc = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ------------------------------- ZIP -------------------------------- */
  const CRC = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    CRC[i] = c >>> 0;
  }
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function zipStore(files) {
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const nameB = enc(f.name), data = f.data, crc = crc32(data);
      const lh = new Uint8Array(30 + nameB.length);
      const dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true); dv.setUint16(6, 0, true); dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true); dv.setUint16(12, 0x21, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, data.length, true); dv.setUint32(22, data.length, true);
      dv.setUint16(26, nameB.length, true); dv.setUint16(28, 0, true);
      lh.set(nameB, 30);
      parts.push(lh, data);

      const ch = new Uint8Array(46 + nameB.length);
      const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint16(8, 0, true); cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true); cv.setUint16(14, 0x21, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameB.length, true);
      cv.setUint32(42, offset, true);
      ch.set(nameB, 46);
      central.push(ch);
      offset += lh.length + data.length;
    }
    const cdSize = central.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);

    const all = parts.concat(central, [end]);
    const total = all.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }

  /* ------------------------------ Stile ------------------------------- */
  const THIN = '<border><left style="thin"><color rgb="FFD6DBE2"/></left><right style="thin"><color rgb="FFD6DBE2"/></right><top style="thin"><color rgb="FFD6DBE2"/></top><bottom style="thin"><color rgb="FFD6DBE2"/></bottom><diagonal/></border>';

  function styles() {
    const fonts = ['<font><sz val="11"/><color rgb="FF1B2A41"/><name val="Calibri"/></font>'];
    const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
    const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    const idx = (arr, xml) => { const i = arr.indexOf(xml); return i >= 0 ? i : arr.push(xml) - 1; };

    function get(s) {
      s = s || {};
      const fi = idx(fonts, `<font><sz val="${s.size || 11}"/>${s.bold ? "<b/>" : ""}<color rgb="${s.color || "FF1B2A41"}"/><name val="Calibri"/></font>`);
      const fl = s.fill ? idx(fills, `<fill><patternFill patternType="solid"><fgColor rgb="${s.fill}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
      const bo = s.border ? idx(borders, THIN) : 0;
      const a = s.align;
      const al = a ? `<alignment${a.h ? ` horizontal="${a.h}"` : ""}${a.v ? ` vertical="${a.v}"` : ""}${a.wrap ? ' wrapText="1"' : ""}/>` : "";
      const attrs = `numFmtId="0" fontId="${fi}" fillId="${fl}" borderId="${bo}" xfId="0" applyFont="1"${fl ? ' applyFill="1"' : ""}${bo ? ' applyBorder="1"' : ""}${al ? ' applyAlignment="1"' : ""}`;
      return idx(xfs, al ? `<xf ${attrs}>${al}</xf>` : `<xf ${attrs}/>`);
    }
    function xml() {
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills><borders count="${borders.length}">${borders.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs></styleSheet>`;
    }
    return { get, xml };
  }

  /* ------------------------------ Blätter ----------------------------- */
  function colName(n) {
    let s = "";
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
    return s;
  }

  function sheetXml(sh) {
    let rows = "";
    (sh.rows || []).forEach((row, ri) => {
      const r = ri + 1;
      let cells = "";
      (row.cells || []).forEach((c, ci) => {
        if (!c) return;
        const ref = colName(ci + 1) + r;
        const sAttr = c.s != null ? ` s="${c.s}"` : "";
        if (c.v == null || c.v === "") { if (c.s != null) cells += `<c r="${ref}"${sAttr}/>`; return; }
        if (c.n) cells += `<c r="${ref}"${sAttr}><v>${c.v}</v></c>`;
        else cells += `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(c.v)}</t></is></c>`;
      });
      rows += `<row r="${r}"${row.h ? ` ht="${row.h}" customHeight="1"` : ""}>${cells}</row>`;
    });
    const cols = (sh.cols || []).length
      ? `<cols>${sh.cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.w}" customWidth="1"/>`).join("")}</cols>`
      : "";
    const fz = sh.freeze
      ? `<pane xSplit="${sh.freeze.x}" ySplit="${sh.freeze.y}" topLeftCell="${colName(sh.freeze.x + 1)}${sh.freeze.y + 1}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight"/>`
      : "";
    const merges = (sh.merges || []).length
      ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
      : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="0" workbookViewId="0">${fz}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData>${merges}</worksheet>`;
  }

  function build({ sheets, stylesXml }) {
    const files = [];
    const sheetOverrides = sheets.map((_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
    files.push({
      name: "[Content_Types].xml",
      data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetOverrides}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    });
    files.push({
      name: "_rels/.rels",
      data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    });
    files.push({
      name: "xl/workbook.xml",
      data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`),
    });
    files.push({
      name: "xl/_rels/workbook.xml.rels",
      data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    });
    files.push({ name: "xl/styles.xml", data: enc(stylesXml) });
    sheets.forEach((sh, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc(sheetXml(sh)) }));
    return zipStore(files);
  }

  DP.xlsx = { build, styles, colName };
})();
