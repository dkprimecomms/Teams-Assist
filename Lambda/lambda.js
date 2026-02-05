// backend/index.mjs (AWS Lambda entry)
import { createRemoteJWKSet, jwtVerify } from "jose";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const TENANT_ID = process.env.AAD_TENANT_ID;
const CLIENT_ID = process.env.AAD_CLIENT_ID;
const CLIENT_SECRET = process.env.AAD_CLIENT_SECRET;

const DEV_BYPASS_AUTH = String(process.env.DEV_BYPASS_AUTH || "").toLowerCase() === "true";

if (DEV_BYPASS_AUTH) {
  console.warn("⚠️ DEV_BYPASS_AUTH ENABLED — /summarize can be called WITHOUT token. DO NOT USE IN PROD.");
}

if (!TENANT_ID || !CLIENT_ID) {
  console.error("Missing env vars: AAD_TENANT_ID and/or AAD_CLIENT_ID");
}

const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;
const JWKS_URL = `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

// Bedrock
const BEDROCK_REGION = process.env.AWS_REGION || "us-west-2";
const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20240620-v1:0";
const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,*",
    "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function getQueryParam(event, name) {
  const qs = event?.rawQueryString || "";
  const params = new URLSearchParams(qs);
  return params.get(name);
}

function binary(statusCode, contentType, buffer) {
  return {
    statusCode,
    headers: { ...corsHeaders(), "Content-Type": contentType },
    body: buffer.toString("base64"),
    isBase64Encoded: true,
  };
}

function json(_event, statusCode, bodyObj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(bodyObj),
  };
}

async function readJsonBody(event) {
  try {
    return event?.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

async function verifyTeamsToken(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: ISSUER,
    audience: CLIENT_ID,
  });
  return payload;
}

async function getGraphTokenOBO(teamsToken) {
  if (!CLIENT_SECRET) throw new Error("Server misconfigured: missing AAD_CLIENT_SECRET");

  const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

  const form = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    requested_token_use: "on_behalf_of",
    assertion: teamsToken,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) throw new Error(`OBO failed (${res.status}): ${JSON.stringify(data)}`);

  return data.access_token;
}

async function graphGet(accessToken, pathAndQuery) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${pathAndQuery}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) throw new Error(`Graph GET failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

// ✅ NEW: supports absolute nextLink URLs OR /v1.0 paths
async function graphGetAny(accessToken, urlOrPath) {
  const isAbsolute = /^https?:\/\//i.test(urlOrPath);
  const url = isAbsolute ? urlOrPath : `https://graph.microsoft.com/v1.0${urlOrPath}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) throw new Error(`Graph GET failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function graphGetText(accessToken, pathAndQuery) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${pathAndQuery}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "text/vtt",
    },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Graph GET TEXT failed (${res.status}): ${text.slice(0, 400)}`);
  return text;
}

function parseGraphDateTimeToUTC(dateTimeStr) {
  if (!dateTimeStr || typeof dateTimeStr !== "string") return null;
  const hasZone = /Z$|[+-]\d{2}:\d{2}$/.test(dateTimeStr);
  const s = hasZone ? dateTimeStr : `${dateTimeStr}Z`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

function computeStatus(ev, nowUtcMs) {
  if (ev?.isCancelled) return "skipped";

  const start = parseGraphDateTimeToUTC(ev?.start?.dateTime);
  const end = parseGraphDateTimeToUTC(ev?.end?.dateTime);

  if (end && end.getTime() < nowUtcMs) return "completed";
  if (start && start.getTime() > nowUtcMs) return "upcoming";
  return "upcoming";
}

function extractJoinUrl(ev) {
  return ev?.onlineMeeting?.joinUrl || ev?.onlineMeetingUrl || "";
}

// Invitees helpers
function pickEmail(addr) {
  return addr?.address || addr?.emailAddress?.address || "";
}
function pickName(addr) {
  return addr?.name || addr?.emailAddress?.name || "";
}

function normalizeAttendees(attendees = []) {
  return (attendees || []).map((a) => {
    const emailObj = a?.emailAddress || {};
    return {
      name: pickName(emailObj) || "",
      email: (pickEmail(emailObj) || "").toLowerCase(),
      role: a?.type || "attendee",
      response: a?.status?.response || "",
    };
  });
}

function normalizeOrganizer(organizer) {
  const o = organizer?.emailAddress || organizer || {};
  return {
    name: pickName(o) || organizer?.name || "",
    email: (pickEmail(o) || organizer?.email || "").toLowerCase(),
  };
}

// IMPORTANT: OData string escaping
function escapeODataString(s) {
  return String(s || "").replace(/'/g, "''");
}

function buildRawForUI(ev) {
  return {
    id: ev?.id,
    subject: ev?.subject,
    start: ev?.start,
    end: ev?.end,
    isCancelled: !!ev?.isCancelled,
    isOnlineMeeting: !!ev?.isOnlineMeeting,
    onlineMeetingProvider: ev?.onlineMeetingProvider || null,
    onlineMeetingUrl: ev?.onlineMeetingUrl || null,
    onlineMeeting: ev?.onlineMeeting
      ? {
          joinUrl: ev.onlineMeeting.joinUrl || null,
          conferenceId: ev.onlineMeeting.conferenceId || null,
          tollNumber: ev.onlineMeeting.tollNumber || null,
          quickDial: ev.onlineMeeting.quickDial || null,
        }
      : null,
    location: ev?.location || null,
    locations: ev?.locations || null,
    organizer: ev?.organizer || null,
    attendees: ev?.attendees || null,
    bodyPreview: ev?.bodyPreview || "",
    importance: ev?.importance || null,
    sensitivity: ev?.sensitivity || null,
    showAs: ev?.showAs || null,
    // ✅ recurrence + series fields
    recurrence: ev?.recurrence || null,
    seriesMasterId: ev?.seriesMasterId || null,
    type: ev?.type || null, // Graph "type": singleInstance/occurrence/exception/seriesMaster
    iCalUId: ev?.iCalUId || null,
    // meta
    createdDateTime: ev?.createdDateTime || null,
    lastModifiedDateTime: ev?.lastModifiedDateTime || null,
    webLink: ev?.webLink || null,
  };
}

function normalizeEvent(ev, nowUtcMs) {
  const start = parseGraphDateTimeToUTC(ev?.start?.dateTime);
  const end = parseGraphDateTimeToUTC(ev?.end?.dateTime);

  const organizer = normalizeOrganizer(ev?.organizer);
  const attendees = normalizeAttendees(ev?.attendees);

  const locationDisplay = ev?.location?.displayName || ev?.locations?.[0]?.displayName || "";

  return {
    id: ev.id,
    title: ev.subject || "(no subject)",
    status: computeStatus(ev, nowUtcMs),

    startUTC: start ? start.toISOString() : null,
    endUTC: end ? end.toISOString() : null,

    isCancelled: !!ev.isCancelled,
    isOnlineMeeting: !!ev.isOnlineMeeting,
    onlineProvider: ev?.onlineMeetingProvider || null,

    joinWebUrl: extractJoinUrl(ev),

    organizer,
    attendees,
    location: locationDisplay,
    bodyPreview: ev?.bodyPreview || "",

    // ✅ Recurrence support
    eventType: ev?.type || null,
    seriesMasterId: ev?.seriesMasterId || null,
    iCalUId: ev?.iCalUId || null,
    recurrence: ev?.recurrence || null,

    raw: buildRawForUI(ev),
  };
}

// -------- Summarization helpers --------

function stripWebvttHeader(vtt) {
  const s = String(vtt || "").replace(/\r\n/g, "\n");
  return s.replace(/^WEBVTT[^\n]*\n+/i, "").trim();
}

async function bedrockSummarize({ title, transcript }) {
  const safeTitle = title || "Meeting";
  const t = stripWebvttHeader(transcript || "");

  const prompt = `You are an assistant that writes clear meeting summaries.

Meeting Title: ${safeTitle}

Transcript:
"""${t}"""

Return STRICT JSON ONLY in this exact shape:
{
  "purpose": "string",
  "takeaways": ["string", "string"],
  "detailedSummary": "string",
  "actionItems": [
    { "task": "string", "owner": "string|null", "dueDate": "string|null" }
  ]
}

Rules:
- Keep purpose to 1-2 sentences.
- Takeaways: 3-7 bullets.
- Detailed summary: 1-3 short paragraphs.
- Action items: only if present; otherwise empty array.
- If owner/dueDate not known, use null.`;

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 900,
    temperature: 0.2,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  });

  const cmd = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  const resp = await bedrock.send(cmd);
  const raw = new TextDecoder().decode(resp.body);
  const parsed = JSON.parse(raw);

  const text = (parsed?.content?.[0]?.text || "").trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Model did not return JSON.");
    return JSON.parse(m[0]);
  }
}

// -------- Lambda handler --------

export const handler = async (event) => {
  try {
    const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";
    const path = event?.rawPath || event?.path || "/";

    // Preflight
    if (method === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders(), body: "" };
    }

    // GET /health
    if (method === "GET" && path === "/health") {
      return json(event, 200, {
        ok: true,
        service: "teamsassist-backend",
        region: BEDROCK_REGION,
        model: BEDROCK_MODEL_ID,
        devBypassAuth: DEV_BYPASS_AUTH,
      });
    }

    // POST /whoami
    if (method === "POST" && (path === "/" || path === "/whoami")) {
      const body = await readJsonBody(event);
      if (!body) return json(event, 400, { ok: false, error: "Invalid JSON body" });
      if (!body.token) return json(event, 400, { ok: false, error: "Missing token in body" });

      try {
        const payload = await verifyTeamsToken(body.token);
        return json(event, 200, {
          ok: true,
          upn: payload.preferred_username,
          name: payload.name,
          tid: payload.tid,
          oid: payload.oid,
          aud: payload.aud,
          scp: payload.scp,
        });
      } catch (e) {
        return json(event, 401, {
          ok: false,
          error: "Token verification failed",
          detail: String(e?.message || e),
        });
      }
    }

    // POST /graph/me
    if (method === "POST" && path === "/graph/me") {
      const body = await readJsonBody(event);
      if (!body) return json(event, 400, { ok: false, error: "Invalid JSON body" });
      if (!body.token) return json(event, 400, { ok: false, error: "Missing token" });

      try {
        await verifyTeamsToken(body.token);
        const graphToken = await getGraphTokenOBO(body.token);
        const me = await graphGet(graphToken, "/me");
        return json(event, 200, { ok: true, me });
      } catch (e) {
        return json(event, 500, { ok: false, error: String(e?.message || e) });
      }
    }

    // ✅ UPDATED: POST /graph/events with pagination
    // Body: { token, startISO, endISO, status?, cursor?, pageSize? }
    if (method === "POST" && path === "/graph/events") {
      const body = await readJsonBody(event);
      if (!body) return json(event, 400, { ok: false, error: "Invalid JSON body" });
      if (!body.token) return json(event, 400, { ok: false, error: "Missing token" });

      const {
        startISO,
        endISO,
        status: desiredStatus,
        cursor = null,
        pageSize = 20,
      } = body;

      if (!startISO || !endISO) {
        return json(event, 400, { ok: false, error: "Missing startISO/endISO" });
      }

      try {
        await verifyTeamsToken(body.token);
        const graphToken = await getGraphTokenOBO(body.token);

        const top = Math.max(1, Math.min(200, Number(pageSize) || 20));

        const baseQuery =
          `/me/calendarView?startDateTime=${encodeURIComponent(startISO)}` +
          `&endDateTime=${encodeURIComponent(endISO)}` +
          `&$select=` +
          [
            "id",
            "subject",
            "start",
            "end",
            "isCancelled",
            "isOnlineMeeting",
            "onlineMeetingProvider",
            "onlineMeeting",
            "onlineMeetingUrl",
            "organizer",
            "attendees",
            "location",
            "locations",
            "bodyPreview",
            "importance",
            "sensitivity",
            "type",
            "seriesMasterId",
            "iCalUId",
            "recurrence",
            "showAs",
            "createdDateTime",
            "lastModifiedDateTime",
            "webLink",
          ].join(",") +
          `&$orderby=start/dateTime` +
          `&$top=${top}`;

        // If cursor present, it's the Graph @odata.nextLink (absolute URL).
        let nextUrl = cursor || baseQuery;

        const nowUtcMs = Date.now();
        const collected = [];

        // Because you filter by status AFTER normalization, we may need to read multiple Graph pages
        const MAX_GRAPH_PAGES_PER_UI_PAGE = 6;
        let pagesFetched = 0;

        let finalNextCursor = null;

        while (nextUrl && collected.length < top && pagesFetched < MAX_GRAPH_PAGES_PER_UI_PAGE) {
          pagesFetched += 1;

          const data = await graphGetAny(graphToken, nextUrl);

          const graphItems = data?.value || [];
          const graphNext = data?.["@odata.nextLink"] || null;

          let normalized = graphItems.map((ev) => normalizeEvent(ev, nowUtcMs));

          // ✅ Enrich recurrence for occurrences/exceptions:
          // 1) try seriesMasterId
          // 2) fallback to iCalUId -> seriesMaster -> recurrence
          const needMaster = normalized.filter((m) => !m.recurrence && (m.seriesMasterId || m.iCalUId));

          if (needMaster.length) {
            const masterBySeriesId = {};
            const masterByIcal = {};

            const seriesIds = [...new Set(needMaster.map((m) => m.seriesMasterId).filter(Boolean))];
            for (const sid of seriesIds) {
              try {
                const master = await graphGet(
                  graphToken,
                  `/me/events/${encodeURIComponent(sid)}?$select=id,recurrence`
                );
                masterBySeriesId[sid] = master?.recurrence || null;
              } catch {
                masterBySeriesId[sid] = null;
              }
            }

            const icalUids = [...new Set(needMaster.map((m) => m.iCalUId).filter(Boolean))];
            for (const uid of icalUids) {
              try {
                const escaped = escapeODataString(uid);
                const res = await graphGet(
                  graphToken,
                  `/me/events?$filter=iCalUId eq '${escaped}' and type eq 'seriesMaster'&$select=id,recurrence&$top=1`
                );
                masterByIcal[uid] = res?.value?.[0]?.recurrence || null;
              } catch {
                masterByIcal[uid] = null;
              }
            }

            normalized = normalized.map((m) => {
              if (m.recurrence) return m;

              const r1 = m.seriesMasterId ? masterBySeriesId[m.seriesMasterId] : null;
              const r2 = !r1 && m.iCalUId ? masterByIcal[m.iCalUId] : null;

              return r1 || r2 ? { ...m, recurrence: r1 || r2 } : m;
            });
          }

          const pageFiltered = desiredStatus
            ? normalized.filter((m) => m.status === desiredStatus)
            : normalized;

          for (const item of pageFiltered) {
            collected.push(item);
            if (collected.length >= top) break;
          }

          nextUrl = graphNext;
          finalNextCursor = graphNext;
        }

        // If no more pages, nextCursor will be null.
        return json(event, 200, {
          ok: true,
          value: collected,
          nextCursor: finalNextCursor || null,
        });
      } catch (e) {
        return json(event, 500, { ok: false, error: String(e?.message || e) });
      }
    }

    // POST /graph/invitees
    // Body: { token, eventId }
    if (method === "POST" && path === "/graph/invitees") {
      const body = await readJsonBody(event);
      if (!body) return json(event, 400, { ok: false, error: "Invalid JSON body" });
      if (!body.token) return json(event, 400, { ok: false, error: "Missing token" });
      if (!body.eventId) return json(event, 400, { ok: false, error: "Missing eventId" });

      try {
        await verifyTeamsToken(body.token);
        const graphToken = await getGraphTokenOBO(body.token);

        const ev = await graphGet(
          graphToken,
          `/me/events/${encodeURIComponent(body.eventId)}?$select=organizer,attendees`
        );

        const invitees = [];
        const seen = new Set();

        // Organizer
        if (ev?.organizer?.emailAddress) {
          const orgEmail = (pickEmail(ev.organizer.emailAddress) || "").toLowerCase();
          invitees.push({
            name: pickName(ev.organizer.emailAddress) || "Organizer",
            email: orgEmail,
            role: "organizer",
            response: "",
          });
          if (orgEmail) seen.add(orgEmail);
        }

        // Attendees
        for (const a of ev?.attendees || []) {
          const emailObj = a?.emailAddress || {};
          const email = (pickEmail(emailObj) || "").toLowerCase();
          if (!email) continue;
          if (seen.has(email)) continue;
          seen.add(email);

          invitees.push({
            name: pickName(emailObj) || email || "(no name)",
            email,
            role: a?.type || "attendee",
            response: a?.status?.response || "",
          });
        }

        return json(event, 200, { ok: true, invitees });
      } catch (e) {
        return json(event, 500, { ok: false, error: String(e?.message || e) });
      }
    }

    // GET /graph/photo?userIdOrEmail=someone@domain.com
    if (method === "GET" && path === "/graph/photo") {
      try {
        const userIdOrEmail = getQueryParam(event, "userIdOrEmail");
        if (!userIdOrEmail) return json(event, 400, { ok: false, error: "Missing userIdOrEmail" });

        const auth = event?.headers?.authorization || event?.headers?.Authorization || "";
        const teamsToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!teamsToken) return json(event, 401, { ok: false, error: "Missing Bearer token" });

        await verifyTeamsToken(teamsToken);
        const graphToken = await getGraphTokenOBO(teamsToken);

        const res = await fetch(
          `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userIdOrEmail)}/photo/$value`,
          { headers: { Authorization: `Bearer ${graphToken}` } }
        );

        if (res.status === 404) return json(event, 404, { ok: false, error: "No photo" });

        if (!res.ok) {
          const t = await res.text();
          return json(event, 500, {
            ok: false,
            error: `Photo fetch failed (${res.status})`,
            detail: t.slice(0, 300),
          });
        }

        const arr = new Uint8Array(await res.arrayBuffer());
        const ct = res.headers.get("content-type") || "image/jpeg";
        return binary(200, ct, Buffer.from(arr));
      } catch (e) {
        return json(event, 500, { ok: false, error: String(e?.message || e) });
      }
    }

    // POST /graph/transcript
    // Body: { token, joinWebUrl }
    if (method === "POST" && path === "/graph/transcript") {
      const body = await readJsonBody(event);
      if (!body) return json(event, 400, { ok: false, error: "Invalid JSON body" });
      if (!body.token) return json(event, 400, { ok: false, error: "Missing token" });
      if (!body.joinWebUrl) return json(event, 400, { ok: false, error: "Missing joinWebUrl" });

      try {
        await verifyTeamsToken(body.token);
        const graphToken = await getGraphTokenOBO(body.token);

        // 1) Find onlineMeeting by joinWebUrl
        const escapedJoin = String(body.joinWebUrl).replace(/'/g, "''");
        const filter = `$filter=JoinWebUrl eq '${escapedJoin}'`;
        const om = await graphGet(graphToken, `/me/onlineMeetings?${encodeURI(filter)}`);

        const onlineMeeting = (om.value || [])[0];
        if (!onlineMeeting?.id) {
          return json(event, 404, { ok: false, error: "Online meeting not found for joinWebUrl" });
        }

        const meetingId = onlineMeeting.id;

        // 2) List transcripts
        const transcripts = await graphGet(graphToken, `/me/onlineMeetings/${meetingId}/transcripts`);
        const list = transcripts.value || [];
        if (list.length === 0) return json(event, 404, { ok: false, error: "No transcripts found for this meeting" });

        const last = list[list.length - 1];
        const transcriptId = last.id;

        // 3) Download transcript content
        const vtt = await graphGetText(
          graphToken,
          `/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content?$format=text/vtt`
        );

        return json(event, 200, {
          ok: true,
          meetingId,
          transcriptId,
          contentType: "text/vtt",
          vtt,
        });
      } catch (e) {
        return json(event, 500, { ok: false, error: String(e?.message || e) });
      }
    }

    // POST /summarize
    // Body: { token?, title?, transcriptVtt }
    if (method === "POST" && path === "/summarize") {
      const body = await readJsonBody(event);
      if (!body) return json(event, 400, { ok: false, error: "Invalid JSON body" });
      if (!body.transcriptVtt) return json(event, 400, { ok: false, error: "Missing transcriptVtt" });

      if (!DEV_BYPASS_AUTH && !body.token) {
        return json(event, 400, { ok: false, error: "Missing token" });
      }

      try {
        if (!DEV_BYPASS_AUTH) await verifyTeamsToken(body.token);

        const summaryJson = await bedrockSummarize({
          title: body.title || "",
          transcript: body.transcriptVtt,
        });

        return json(event, 200, { ok: true, summary: summaryJson });
      } catch (e) {
        return json(event, 500, { ok: false, error: String(e?.message || e) });
      }
    }

    return json(event, 404, { ok: false, error: "Not found", method, path });
  } catch (e) {
    return json(event, 500, {
      ok: false,
      error: "Unhandled server error",
      detail: String(e?.message || e),
    });
  }
};
