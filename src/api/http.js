const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export async function postJson(path, body) {
  if (!BASE) throw new Error("Missing VITE_API_BASE_URL");

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { res, data };
}
