// src/api/logApi.js
import { getTeamsToken } from "./authApi";

const LOGGER_BASE = (import.meta.env.VITE_LOGGER_URL || "").replace(/\/+$/, "");

export async function logAppOpen() {
  // If env var not set, do nothing (safe for local/dev)
  if (!LOGGER_BASE) return;

  const token = await getTeamsToken();

  await fetch(`${LOGGER_BASE}/log/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}
