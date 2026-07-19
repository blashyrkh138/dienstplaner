// Schlanker API-Client fuer den lokalen Server.

async function api(path, { method = "GET", body } = {}) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error((data && data.error) || `Fehler ${res.status}`);
  }
  return data;
}

export const API = {
  bootstrap: () => api("/api/bootstrap"),
  week: (loc, year, week) => api(`/api/week?location_id=${loc}&year=${year}&week=${week}`),
  plan: (body) => api("/api/plan", { method: "POST", body }),
  applyAvailability: (entries) => api("/api/apply_availability", { method: "POST", body: { entries } }),
  settings: () => api("/api/settings"),
  saveSettings: (obj) => api("/api/settings", { method: "PUT", body: obj }),

  // Generisches CRUD
  list: (table, query = "") => api(`/api/${table}${query ? "?" + query : ""}`),
  create: (table, obj) => api(`/api/${table}`, { method: "POST", body: obj }),
  update: (table, id, obj) => api(`/api/${table}/${id}`, { method: "PUT", body: obj }),
  remove: (table, id) => api(`/api/${table}/${id}`, { method: "DELETE" }),
};
