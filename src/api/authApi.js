// src/api/authApi.js
import * as microsoftTeams from "@microsoft/teams-js";

let cachedToken = null;
let cachedTokenExpMs = 0;

// Refresh a little before expiry (2 minutes)
const REFRESH_SKEW_MS = 2 * 60 * 1000;

function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getTokenExpMs(token) {
  const payload = decodeJwtPayload(token);
  const expSec = payload?.exp;
  if (!expSec || typeof expSec !== "number") return 0;
  return expSec * 1000;
}

function shouldRefreshNow() {
  if (!cachedToken) return true;
  if (!cachedTokenExpMs) return true;

  const now = Date.now();
  // refresh if already expired OR within skew window
  return now >= (cachedTokenExpMs - REFRESH_SKEW_MS);
}

async function fetchNewTeamsToken() {
  await microsoftTeams.app.initialize();

  const token = await new Promise((resolve, reject) => {
    microsoftTeams.authentication.getAuthToken({
      successCallback: (t) => resolve(t),
      failureCallback: (err) => reject(err),
    });
  });

  cachedToken = token;
  cachedTokenExpMs = getTokenExpMs(token);
  return token;
}

/**
 * Get a Teams SSO token.
 * - Automatically refreshes if expired/near-expired.
 * - Pass { forceRefresh: true } to force a new token.
 */
export async function getTeamsToken({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    cachedToken = null;
    cachedTokenExpMs = 0;
  }

  if (!shouldRefreshNow()) return cachedToken;

  return fetchNewTeamsToken();
}

export function clearTeamsToken() {
  cachedToken = null;
  cachedTokenExpMs = 0;
}
