/* Deutsche gesetzliche Feiertage - offline berechnet.
   Port von backend/holidays.py. Nur HINWEIS: Zentren koennen geoeffnet sein. */
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});

  const BUNDESLAENDER = {
    BW: "Baden-Wuerttemberg", BY: "Bayern", BE: "Berlin", BB: "Brandenburg",
    HB: "Bremen", HH: "Hamburg", HE: "Hessen", MV: "Mecklenburg-Vorpommern",
    NI: "Niedersachsen", NW: "Nordrhein-Westfalen", RP: "Rheinland-Pfalz",
    SL: "Saarland", SN: "Sachsen", ST: "Sachsen-Anhalt", SH: "Schleswig-Holstein",
    TH: "Thueringen",
  };

  function iso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

  // Ostersonntag (anonymer gregorianischer Algorithmus)
  function easterSunday(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function bussUndBettag(year) {
    let d = new Date(year, 10, 22); // 22. November
    while (d.getDay() !== 3) d = addDays(d, -1); // Mittwoch davor
    return d;
  }

  /** {"YYYY-MM-DD": "Name"} fuer Jahr + (optional) Bundesland. */
  function holidaysFor(year, bundesland) {
    const bl = (bundesland || "").toUpperCase();
    const e = easterSunday(year);
    const out = {};
    const add = (d, name) => { out[iso(d)] = name; };

    add(new Date(year, 0, 1), "Neujahr");
    add(addDays(e, -2), "Karfreitag");
    add(addDays(e, 1), "Ostermontag");
    add(new Date(year, 4, 1), "Tag der Arbeit");
    add(addDays(e, 39), "Christi Himmelfahrt");
    add(addDays(e, 50), "Pfingstmontag");
    add(new Date(year, 9, 3), "Tag der Deutschen Einheit");
    add(new Date(year, 11, 25), "1. Weihnachtstag");
    add(new Date(year, 11, 26), "2. Weihnachtstag");

    if (["BW", "BY", "ST"].includes(bl)) add(new Date(year, 0, 6), "Heilige Drei Koenige");
    if (["BE", "MV"].includes(bl)) add(new Date(year, 2, 8), "Internationaler Frauentag");
    if (bl === "BB") { add(e, "Ostersonntag"); add(addDays(e, 49), "Pfingstsonntag"); }
    if (["BW", "BY", "HE", "NW", "RP", "SL"].includes(bl)) add(addDays(e, 60), "Fronleichnam");
    if (["SL", "BY"].includes(bl)) add(new Date(year, 7, 15), "Mariae Himmelfahrt");
    if (bl === "TH") add(new Date(year, 8, 20), "Weltkindertag");
    if (["BB", "HB", "HH", "MV", "NI", "SN", "ST", "SH", "TH"].includes(bl))
      add(new Date(year, 9, 31), "Reformationstag");
    if (["BW", "BY", "NW", "RP", "SL"].includes(bl)) add(new Date(year, 10, 1), "Allerheiligen");
    if (bl === "SN") add(bussUndBettag(year), "Buss- und Bettag");

    return out;
  }

  DP.holidays = { BUNDESLAENDER, easterSunday, holidaysFor };
})();
