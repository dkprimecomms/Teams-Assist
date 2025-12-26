// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ConfidentialClientApplication } from "@azure/msal-node";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
});

// Cache token in memory to avoid re-auth on every request
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

// OData string literal escaping (escape single quotes by doubling them)
function odataStringLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function fetchRecentCallRecords(token, days = 7) {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

  // ✅ no $top (your error says it's not allowed)
  let url =
    `https://graph.microsoft.com/v1.0/communications/callRecords` +
    `?$select=id,startDateTime,endDateTime,joinWebUrl,organizer`;

  const map = new Map();
  const maxPages = 10; // safety cap to avoid endless paging
  let page = 0;

  while (url && page < maxPages) {
    page++;

    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(await r.text());

    const data = await r.json();
    const batch = data.value || [];

    // filter recent and build joinWebUrl->latest record map
    for (const cr of batch) {
      const s = cr.startDateTime ? new Date(cr.startDateTime).getTime() : 0;
      if (s < sinceMs) continue;
      if (!cr.joinWebUrl) continue;

      const prev = map.get(cr.joinWebUrl);
      if (!prev) {
        map.set(cr.joinWebUrl, cr);
      } else {
        const prevS = prev.startDateTime ? new Date(prev.startDateTime).getTime() : 0;
        if (s > prevS) map.set(cr.joinWebUrl, cr);
      }
    }

    // stop early if this page is already older than our window (helps performance)
    const oldestInBatchMs = batch.reduce((min, cr) => {
      const t = cr.startDateTime ? new Date(cr.startDateTime).getTime() : Infinity;
      return Math.min(min, t);
    }, Infinity);

    if (oldestInBatchMs !== Infinity && oldestInBatchMs < sinceMs) {
      break;
    }

    url = data["@odata.nextLink"] || null;
  }

  return map;
}


/**
 * GET /api/meetings?status=upcoming|completed|skipped
 * Status logic:
 * - cancelled -> skipped
 * - if joinUrl exists and callRecord ended -> completed (even if scheduled end is later)
 * - else fallback to scheduled end time
 */
app.get("/api/meetings", async (req, res) => {
  try {
    const token = await getAppToken();
    const userId = process.env.TARGET_USER_ID;
    const status = String(req.query.status || "upcoming").toLowerCase();

    const now = new Date();

    // ✅ smaller ranges per tab
    let start, end;
    if (status === "upcoming") {
      start = now;
      end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    } else if (status === "completed") {
      start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      end = now;
    } else if (status === "skipped") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
      start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    }

    const url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}` +
      `/calendarView?startDateTime=${encodeURIComponent(toIsoNoMs(start))}` +
      `&endDateTime=${encodeURIComponent(toIsoNoMs(end))}` +
      `&$select=subject,start,end,isCancelled,isOnlineMeeting,onlineMeetingProvider,onlineMeeting,webLink,organizer` +
      `&$orderby=start/dateTime`;

    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.timezone="Asia/Kolkata"',
      },
    });

    if (!r.ok) return res.status(r.status).send(await r.text());
    const data = await r.json();

    const items = (data.value || []).map((e) => {
      const s = e.start?.dateTime ? new Date(e.start.dateTime) : null;
      const en = e.end?.dateTime ? new Date(e.end.dateTime) : null;

      const when =
        s && en
          ? `${s.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} → ${en.toLocaleString(
              "en-IN",
              { timeStyle: "short" }
            )}`
          : "Time not available";

      const joinUrl = e.isOnlineMeeting ? (e.onlineMeeting?.joinUrl || null) : null;

      let derivedStatus = "upcoming";
      if (e.isCancelled) derivedStatus = "skipped";
      else if (en && en <= now) derivedStatus = "completed";
      else derivedStatus = "upcoming";

      return {
        id: e.id,
        title: e.subject || "(No subject)",
        when,
        status: derivedStatus,
        joinUrl,
        webLink: e.webLink || null,
        organizer: e.organizer?.emailAddress?.name || e.organizer?.emailAddress?.address || null,
      };
    });

    // Filter by requested status
    res.json(items.filter((m) => m.status === status));
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});



/**
 * GET /api/meetings/:eventId/invitees
 * Works for upcoming meetings (invitees from calendar)
 */
app.get("/api/meetings/:eventId/invitees", async (req, res) => {
  try {
    const token = await getAppToken();
    const userId = process.env.TARGET_USER_ID;
    const eventId = req.params.eventId;

    const url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}` +
      `/events/${encodeURIComponent(eventId)}?$select=organizer,attendees`;

    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return res.status(r.status).send(await r.text());

    const e = await r.json();

    const organizer = e?.organizer?.emailAddress
      ? [
          {
            name: e.organizer.emailAddress.name,
            email: e.organizer.emailAddress.address,
            role: "organizer",
          },
        ]
      : [];

    const invitees = (e?.attendees || []).map((a) => ({
      name: a?.emailAddress?.name || a?.emailAddress?.address || "Unknown",
      email: a?.emailAddress?.address || null,
      role: a?.type || "attendee", // required | optional | resource
      response: a?.status?.response || null, // accepted | declined | tentative | none
    }));

    // De-dupe (organizer can also appear as attendee)
    const seen = new Set();
    const merged = [...organizer, ...invitees].filter((p) => {
      const key = `${p.email || p.name}-${p.role}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * GET /api/meetings/:eventId/transcript
 * Returns VTT text (text/vtt) when transcript is available.
 * Notes:
 * - Meeting must be a Teams meeting (joinUrl present)
 * - Transcript appears after meeting ends and processing completes
 * - With app-only, your tenant may require an Application Access Policy
 */
app.get("/api/meetings/:eventId/transcript", async (req, res) => {
  try {
    const token = await getAppToken();
    const userId = process.env.TARGET_USER_ID;
    const eventId = req.params.eventId;

    // 1) Get joinUrl + end time from event
    const eventUrl =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}` +
      `/events/${encodeURIComponent(eventId)}?$select=onlineMeeting,end,isOnlineMeeting`;

    const er = await fetch(eventUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!er.ok) return res.status(er.status).send(await er.text());
    const event = await er.json();

    const joinWebUrl = event?.onlineMeeting?.joinUrl || null;
    if (!joinWebUrl) return res.status(404).json({ error: "No Teams joinUrl on this event." });

    // 2) Resolve onlineMeeting by joinWebUrl (DO NOT percent-encode the value in the filter)
    const omUrl =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}` +
      `/onlineMeetings?$filter=joinWebUrl eq ${odataStringLiteral(joinWebUrl)}`;

    const omr = await fetch(omUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!omr.ok) return res.status(omr.status).send(await omr.text());
    const omData = await omr.json();

    const meetingId = omData?.value?.[0]?.id;
    if (!meetingId) {
      return res.status(404).json({
        error:
          "Could not resolve onlineMeeting from joinUrl. (If using app-only, ensure Application Access Policy is configured.)",
      });
    }

    // 3) Find transcript metadata
    const endDateTime = event?.end?.dateTime ? new Date(event.end.dateTime) : new Date();
    const startWin = new Date(endDateTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endWin = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);

    const getAllUrl =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}` +
      `/onlineMeetings/getAllTranscripts(meetingOrganizerUserId='${encodeURIComponent(userId)}',` +
      `startDateTime=${encodeURIComponent(toIsoNoMs(startWin))},endDateTime=${encodeURIComponent(toIsoNoMs(endWin))})`;

    const tr = await fetch(getAllUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!tr.ok) return res.status(tr.status).send(await tr.text());
    const tData = await tr.json();

    const match = (tData.value || []).find((t) => t.meetingId === meetingId);
    if (!match) return res.status(404).json({ error: "Transcript not found yet for this meeting." });

    const transcriptId = match.id;

    // 4) Get transcript content (VTT)
    const contentUrl =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}` +
      `/onlineMeetings/${encodeURIComponent(meetingId)}` +
      `/transcripts/${encodeURIComponent(transcriptId)}/content?$format=text/vtt`;

    const cr = await fetch(contentUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!cr.ok) return res.status(cr.status).send(await cr.text());

    const vtt = await cr.text();
    res.type("text/vtt").send(vtt);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Backend running on http://localhost:${process.env.PORT || 5000}`);
});
