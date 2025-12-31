const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function postJson(path, body) {
  const base = (API_BASE || "").replace(/\/+$/, "");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}

  return { res, data };
}
