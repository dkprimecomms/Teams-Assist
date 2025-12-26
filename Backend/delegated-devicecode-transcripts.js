// delegated-devicecode-transcripts.js
// Delegated Microsoft Graph auth (Device Code flow) + transcript list + content fetch
//
// Install:
//   npm init -y
//   npm i express dotenv @azure/msal-node
//
// package.json must include:
//   "type": "module"
//
// .env required:
//   CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//   TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//   PORT=5056
//
// Run:
//   node delegated-devicecode-transcripts.js
//
// Steps:
//   1) Open http://localhost:5056/auth/device
//   2) Follow instructions printed in terminal (enter code, sign in)
//   3) Open http://localhost:5056/api/transcripts
//   4) Copy transcriptContentUrl from the response
//   5) Open:
//        http://localhost:5056/api/transcripts/content?url=<ENCODED_TRANSCRIPT_CONTENT_URL>

import express from "express";
import dotenv from "dotenv";
import { PublicClientApplication } from "@azure/msal-node";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 5056;

const pca = new PublicClientApplication({
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
  },
});

// Delegated scopes you want
const SCOPES = [
  "User.Read",
  "OnlineMeetingTranscript.Read.All",
  "OnlineMeetings.Read",
  "Calendars.Read",
];

let tokenCache = {
  accessToken: null,
  expiresAtMs: 0,
  account: null,
};

function toIsoNoMs(d) {
  return new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function graphGetJson(url, accessToken) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!r.ok) {
    return { ok: false, status: r.status, url, error: body };
  }
  return { ok: true, status: r.status, url, data: body };
}

async function graphGetText(url, accessToken) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await r.text();
  if (!r.ok) {
    return { ok: false, status: r.status, url, error: text };
  }
  return { ok: true, status: r.status, url, data: text };
}

async function getDelegatedTokenInteractive() {
  // If we have a valid token, reuse it
  if (tokenCache.accessToken && tokenCache.expiresAtMs - 60_000 > Date.now()) {
    return tokenCache.accessToken;
  }

  // If we have an account, try silent first
  if (tokenCache.account) {
    try {
      const silent = await pca.acquireTokenSilent({
        account: tokenCache.account,
        scopes: SCOPES,
      });
      tokenCache.accessToken = silent.accessToken;
      tokenCache.expiresAtMs = silent.expiresOn?.getTime?.() || (Date.now() + 30 * 60 * 1000);
      return tokenCache.accessToken;
    } catch {
      // fall through to device code
    }
  }

  // Device code flow (interactive)
  const result = await pca.acquireTokenByDeviceCode({
    scopes: SCOPES,
    deviceCodeCallback: (resp) => {
      // This prints the "go to URL and enter code" message
      console.log("\n=== DEVICE CODE SIGN-IN REQUIRED ===");
      console.log(resp.message);
      console.log("===================================\n");
    },
  });

  tokenCache.accessToken = result.accessToken;
  tokenCache.expiresAtMs = result.expiresOn?.getTime?.() || (Date.now() + 30 * 60 * 1000);
  tokenCache.account = result.account;
  return tokenCache.accessToken;
}

function requireAuth(req, res, next) {
  if (!tokenCache.accessToken || tokenCache.expiresAtMs - 60_000 <= Date.now()) {
    return res.status(401).json({
      error: "Not authenticated. Visit /auth/device and sign in first.",
    });
  }
  next();
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Delegated Device-Code Transcript Server",
    steps: [
      `1) Authenticate: http://localhost:${PORT}/auth/device`,
      `2) List transcripts: http://localhost:${PORT}/api/transcripts?daysPast=30&daysFuture=2`,
      `3) Fetch content: http://localhost:${PORT}/api/transcripts/content?url=<ENCODED_TRANSCRIPT_CONTENT_URL>`,
    ],
    scopes: SCOPES,
  });
});

// Step 1: trigger device-code sign-in
app.get("/auth/device", async (req, res) => {
  try {
    await getDelegatedTokenInteractive();
    res.json({
      ok: true,
      message: "Authenticated. Now call /api/transcripts",
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Who am I?
app.get("/me", requireAuth, async (req, res) => {
  const out = await graphGetJson("https://graph.microsoft.com/v1.0/me?$select=id,displayName,userPrincipalName", tokenCache.accessToken);
  res.status(out.ok ? 200 : out.status).json(out);
});

/**
 * List transcripts for meetings organized by the signed-in user.
 */
app.get("/api/transcripts", async (req, res) => {
  try {
    const token = await getDelegatedTokenInteractive();

    const daysPast = Number(req.query.daysPast ?? 30);
    const daysFuture = Number(req.query.daysFuture ?? 2);

    const start = toIsoNoMs(new Date(Date.now() - daysPast * 24 * 60 * 60 * 1000));
    const end = toIsoNoMs(new Date(Date.now() + daysFuture * 24 * 60 * 60 * 1000));

    const me = await graphGetJson("https://graph.microsoft.com/v1.0/me?$select=id", token);
    if (!me.ok) return res.status(me.status).json(me);

    const meId = me.data.id;

    const url =
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/getAllTranscripts(` +
      `meetingOrganizerUserId='${meId}',` +
      `startDateTime=${start},` +
      `endDateTime=${end}` +
      `)`;

    const out = await graphGetJson(url, token);
    res.status(out.ok ? 200 : out.status).json({
      ...out,
      range: { daysPast, daysFuture, start, end },
      count: out.ok ? (out.data.value?.length || 0) : undefined,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/**
 * Fetch transcript content by transcriptContentUrl (usually returns VTT text).
 */
app.get("/api/transcripts/content", async (req, res) => {
  try {
    const token = await getDelegatedTokenInteractive();
    const url = String(req.query.url || "");

    if (!url.startsWith("https://graph.microsoft.com/")) {
      return res.status(400).json({ ok: false, error: "Invalid url. Must start with https://graph.microsoft.com/..." });
    }

    const out = await graphGetText(url, token);
    if (!out.ok) return res.status(out.status).send(out.error);

    res.type("text/plain").send(out.data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Delegated device-code server running: http://localhost:${PORT}`);
  console.log(`Authenticate: http://localhost:${PORT}/auth/device`);
});
