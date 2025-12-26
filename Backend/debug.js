// debug.js
// Standalone Microsoft Graph Debug Server (does NOT touch your existing server.js)
//CLIENT_ID = "f27d2a65-9c99-448f-906a-b7667edfe1ce"
// TENANT_ID = "c4912c53-6a3b-4dd4-b298-7b6b8bf8ba69"
// CLIENT_SECRET = "jwl8Q~iRFz7I3n-0t2pIwkVIi~QZXs-bf64FybtE"
// TARGET_USER_ID="dkanna@primecomms.com"
// PORT=5000
// DEBUG_PORT=5050
// REDIRECT_URI=http://localhost:5055/auth/callback
// 1) In this folder:
//    npm init -y
//    npm i express cors dotenv @azure/msal-node
// 2) Ensure package.json has:  "type": "module"
// 3) Create .env in this folder with:
//    CLIENT_ID=...
//    TENANT_ID=...
//    CLIENT_SECRET=...
//    TARGET_USER_ID=dkanna@primecomms.com   (UPN/email of the mailbox you’re debugging)
//    DEBUG_PORT=5050                        (optional)
//
// Run:
//    node debug.js
//
// Then open in browser:
//   http://localhost:5050/debug/calendarView
//   http://localhost:5050/debug/events
//   http://localhost:5050/debug/onlineMeetings
//   http://localhost:5050/debug/callRecords
//   http://localhost:5050/debug/transcripts
//   http://localhost:5050/debug/transcripts/filter

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ConfidentialClientApplication } from "@azure/msal-node";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.DEBUG_PORT || 5050;

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
});

let tokenCache = { accessToken: null, expiresAt: 0 };

async function getAppToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.accessToken && tokenCache.expiresAt - 60 > now) {
    return tokenCache.accessToken;
  }

  const result = await msalClient.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });

  tokenCache.accessToken = result.accessToken;
  tokenCache.expiresAt = Math.floor(result.expiresOn.getTime() / 1000);
  return tokenCache.accessToken;
}

function toIsoNoMs(d) {
  return new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function graphGet(url, token, extraHeaders = {}) {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
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

// Follow @odata.nextLink pages (cap pages to be safe)
async function graphGetPaged(url, token, { maxPages = 10 } = {}) {
  const pages = [];
  let next = url;
  let page = 0;

  while (next && page < maxPages) {
    page++;
    const out = await graphGet(next, token);
    if (!out.ok) return out;

    pages.push(out.data);
    next = out.data?.["@odata.nextLink"] || null;
  }

  // Merge "value" arrays if present
  const merged = {
    "@odata.context": pages[0]?.["@odata.context"],
    value: pages.flatMap((p) => p?.value || []),
    pagesFetched: pages.length,
    nextLink: pages.at(-1)?.["@odata.nextLink"] || null,
  };

  return { ok: true, status: 200, url, data: merged };
}

// Resolve UPN/email -> AAD user GUID (cache it)
let userGuidCache = { upn: null, guid: null, expiresAt: 0 };
async function getUserGuid(token, upn) {
  const now = Date.now();
  if (userGuidCache.upn === upn && userGuidCache.guid && userGuidCache.expiresAt > now) {
    return userGuidCache.guid;
  }

  const url =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}` +
    `?$select=id,userPrincipalName,displayName`;

  const out = await graphGet(url, token);
  if (!out.ok) throw new Error(`Failed to resolve user GUID: ${JSON.stringify(out.error)}`);

  const guid = out.data?.id;
  if (!guid) throw new Error("Could not find user id (GUID) in /users/{upn} response.");

  userGuidCache = { upn, guid, expiresAt: now + 10 * 60 * 1000 }; // cache 10 minutes
  return guid;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "Graph Debug Server",
    endpoints: {
      calendarView: "/debug/calendarView?daysPast=7&daysFuture=7",
      events: "/debug/events",
      onlineMeetings: "/debug/onlineMeetings?daysPast=30&daysFuture=30",
      callRecords: "/debug/callRecords",
      transcripts_function: "/debug/transcripts?daysPast=14&daysFuture=1",
      transcripts_filter: "/debug/transcripts/filter?maxPages=5",
      raw: "/debug/raw?url=<ENCODED_GRAPH_URL>",
    },
  });
});

/**
 * CalendarView (expanded recurrences) - best source for scheduled meetings.
 */
app.get("/debug/calendarView", async (req, res) => {
  try {
    const token = await getAppToken();
    const upn = process.env.TARGET_USER_ID;

    const daysPast = Number(req.query.daysPast ?? 7);
    const daysFuture = Number(req.query.daysFuture ?? 7);

    const start = new Date(Date.now() - daysPast * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + daysFuture * 24 * 60 * 60 * 1000);

    const url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}` +
      `/calendarView?startDateTime=${encodeURIComponent(toIsoNoMs(start))}` +
      `&endDateTime=${encodeURIComponent(toIsoNoMs(end))}`;

    const out = await graphGetPaged(url, token, { maxPages: 5 });
    res.status(out.ok ? 200 : out.status).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/**
 * Events (non-expanded, recurring shows series masters)
 */
app.get("/debug/events", async (req, res) => {
  try {
    const token = await getAppToken();
    const upn = process.env.TARGET_USER_ID;

    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/events`;
    const out = await graphGetPaged(url, token, { maxPages: 5 });
    res.status(out.ok ? 200 : out.status).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/**
 * OnlineMeetings (NOT a full meetings list). Optional date window via start/end:
 * /users/{id}/onlineMeetings?$filter=startDateTime ge ... and endDateTime le ...
 * We'll apply a window here to avoid huge results.
 */
app.get("/debug/onlineMeetings", async (req, res) => {
  try {
    const token = await getAppToken();
    const upn = process.env.TARGET_USER_ID;

    const daysPast = Number(req.query.daysPast ?? 30);
    const daysFuture = Number(req.query.daysFuture ?? 30);

    const start = toIsoNoMs(new Date(Date.now() - daysPast * 24 * 60 * 60 * 1000));
    const end = toIsoNoMs(new Date(Date.now() + daysFuture * 24 * 60 * 60 * 1000));

    const url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}` +
      `/onlineMeetings?$filter=startDateTime ge ${start} and endDateTime le ${end}`;

    const out = await graphGetPaged(url, token, { maxPages: 5 });
    res.status(out.ok ? 200 : out.status).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/**
 * CallRecords (actual calls/meetings that occurred). No $top because some tenants block it.
 */
app.get("/debug/callRecords", async (req, res) => {
  try {
    const token = await getAppToken();
    const url = `https://graph.microsoft.com/v1.0/communications/callRecords`;
    const out = await graphGetPaged(url, token, { maxPages: 5 });
    res.status(out.ok ? 200 : out.status).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/**
 * Transcripts (FUNCTION FORM) — this is the one your main code uses.
 *
 * Key fixes:
 * 1) Use the organizer GUID (AAD id), not UPN
 * 2) Keep meetingOrganizerUserId quoted
 * 3) Keep startDateTime/endDateTime UNQUOTED (DateTimeOffset literal)
 * 4) Avoid URL-encoding inside the function literal
 */
app.get("/debug/transcripts/latest/content", async (req, res) => {
  try {
    const token = await getAppToken();
    const upn = process.env.TARGET_USER_ID;

    // resolve organizer GUID (reuse your existing getUserGuid)
    const organizerGuid = await getUserGuid(token, upn);

    const start = toIsoNoMs(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));
    const end = toIsoNoMs(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000));

    const listUrl =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerGuid)}` +
      `/onlineMeetings/getAllTranscripts(` +
      `meetingOrganizerUserId='${organizerGuid}',` +
      `startDateTime=${start},` +
      `endDateTime=${end}` +
      `)`;

    const list = await graphGetPaged(listUrl, token, { maxPages: 5 });
    if (!list.ok) return res.status(list.status).json(list);

    const t = list.data.value?.[0];
    if (!t?.transcriptContentUrl) {
      return res.status(404).json({ ok: false, error: "No transcripts found in range." });
    }

    const contentResp = await fetch(t.transcriptContentUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!contentResp.ok) return res.status(contentResp.status).send(await contentResp.text());

    const text = await contentResp.text();
    res.type("text/plain").send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get("/debug/transcripts", async (req, res) => {
  try {
    const token = await getAppToken();
    const upn = process.env.TARGET_USER_ID;

    const daysPast = Number(req.query.daysPast ?? 14);
    const daysFuture = Number(req.query.daysFuture ?? 1);

    const start = toIsoNoMs(new Date(Date.now() - daysPast * 24 * 60 * 60 * 1000));
    const end = toIsoNoMs(new Date(Date.now() + daysFuture * 24 * 60 * 60 * 1000));

    const organizerGuid = await getUserGuid(token, upn);

    // Function call format (datetimes are NOT quoted)
    const url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerGuid)}` +
      `/onlineMeetings/getAllTranscripts(` +
      `meetingOrganizerUserId='${organizerGuid}',` +
      `startDateTime=${start},` +
      `endDateTime=${end}` +
      `)`;

    const out = await graphGetPaged(url, token, { maxPages: 5 });
    res.status(out.ok ? 200 : out.status).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/**
 * Transcripts (FILTER FORM) — often less finicky than the function literal.
 * Note: This may return more, so we page with maxPages.
 *
 * Use:
 *   /debug/transcripts/filter?maxPages=5
 */
app.get("/debug/transcripts/filter", async (req, res) => {
  try {
    const token = await getAppToken();
    const upn = process.env.TARGET_USER_ID;
    const maxPages = Number(req.query.maxPages ?? 5);

    const organizerGuid = await getUserGuid(token, upn);

    const url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerGuid)}` +
      `/onlineMeetings/getAllTranscripts?$filter=meetingOrganizer/user/id eq '${organizerGuid}'`;

    const out = await graphGetPaged(url, token, { maxPages });
    res.status(out.ok ? 200 : out.status).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/**
 * Raw Graph GET passthrough (debug only)
 * Usage:
 *   /debug/raw?url=https%3A%2F%2Fgraph.microsoft.com%2Fv1.0%2Fme
 */
app.get("/debug/raw", async (req, res) => {
  try {
    const token = await getAppToken();
    const url = String(req.query.url || "");

    if (!url.startsWith("https://graph.microsoft.com/")) {
      return res.status(400).json({
        ok: false,
        error: "Only https://graph.microsoft.com/* URLs are allowed.",
      });
    }

    const out = await graphGetPaged(url, token, { maxPages: 5 });
    res.status(out.ok ? 200 : out.status).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Graph Debug Server running: http://localhost:${PORT}`);
  console.log("Try:");
  console.log(`  http://localhost:${PORT}/debug/calendarView`);
  console.log(`  http://localhost:${PORT}/debug/transcripts`);
  console.log(`  http://localhost:${PORT}/debug/transcripts/filter`);
});
