// src/api/http.js
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function postJson(path, body) {
  const base = (API_BASE || "").replace(/\/+$/, "");
  const url = `${base}${path}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 60000); // 60s

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let data = {};
    try {
      data = await res.json();
    } catch {}

    return { res, data };
  } finally {
    clearTimeout(t);
  }
}
