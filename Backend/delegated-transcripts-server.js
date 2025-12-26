import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import { ConfidentialClientApplication } from "@azure/msal-node";

dotenv.config();

const app = express();
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_only_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // for localhost testing, secure should be false
      secure: false,
      maxAge: 60 * 60 * 1000, // 1 hour
    },
  })
);

const PORT = 5055;

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
});

const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/callback`;

// Delegated scopes (add/remove as needed)
const SCOPES = [
  "User.Read",
  "OnlineMeetingTranscript.Read.All",
  "OnlineMeetings.Read",
  // Optional but often useful for mapping meetings to events:
  "Calendars.Read",
];

function toIsoNoMs(d) {
  return new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function graphGet(url, accessToken) {
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
    const err = new Error(typeof body === "string" ? body : JSON.stringify(body));
    err.status = r.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function requireLogin(req, res, next) {
  if (!req.session?.accessToken) {
    return res.status(401).json({
      error: "Not logged in. Visit /auth/login first.",
    });
  }
  next();
}

// Home
app.get("/", (req, res) => {
  res.type("text/plain").send(
    [
      "Delegated Transcript Debug Server",
      "",
      "1) Login:",
      `   http://localhost:${PORT}/auth/login`,
      "",
      "2) List transcripts (delegated):",
      `   http://localhost:${PORT}/api/transcripts`,
      "",
      "3) Fetch transcript content (paste transcriptContentUrl):",
      `   http://localhost:${PORT}/api/transcripts/content?url=<ENCODED_TRANSCRIPT_CONTENT_URL>`,
      "",
      "4) Logout:",
      `   http://localhost:${PORT}/auth/logout`,
    ].join("\n")
  );
});

/**
 * AUTH: start login (Authorization Code flow)
 */
app.get("/auth/login", async (req, res) => {
  try {
    const authCodeUrl = await msalClient.getAuthCodeUrl({
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      prompt: "select_account",
    });
    res.redirect(authCodeUrl);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/**
 * AUTH: callback - exchange code for tokens
 */
app.get("/auth/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("Missing ?code=");

    const tokenResponse = await msalClient.acquireTokenByCode({
      code,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
    });

    // Store tokens in session (good enough for local debugging)
    req.session.accessToken = tokenResponse.accessToken;
    req.session.idToken = tokenResponse.idToken;
    req.session.account = tokenResponse.account;

    res.redirect(`/me`);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.type("text/plain").send("Logged out. Close your browser to clear Microsoft session if needed.");
  });
});

/**
 * Quick check: who am I?
 */
app.get("/me", requireLogin, async (req, res) => {
  try {
    const me = await graphGet("https://graph.microsoft.com/v1.0/me?$select=id,displayName,userPrincipalName", req.session.accessToken);
    res.json({ ok: true, me, scopes: SCOPES });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.body || String(e?.message || e) });
  }
});

/**
 * List transcripts available to the signed-in user (delegated).
 *
 * Notes:
 * - This is the same concept as your app-only getAllTranscripts, but under /me and with delegated token.
 * - You’ll get transcriptContentUrl for each record.
 */
app.get("/api/transcripts", requireLogin, async (req, res) => {
  try {
    const daysPast = Number(req.query.daysPast ?? process.env.DAYS_PAST ?? 30);
    const daysFuture = Number(req.query.daysFuture ?? process.env.DAYS_FUTURE ?? 2);

    const start = toIsoNoMs(new Date(Date.now() - daysPast * 24 * 60 * 60 * 1000));
    const end = toIsoNoMs(new Date(Date.now() + daysFuture * 24 * 60 * 60 * 1000));

    // IMPORTANT: meetingOrganizerUserId must be the signed-in user id
    const me = await graphGet("https://graph.microsoft.com/v1.0/me?$select=id", req.session.accessToken);
    const meId = me.id;

    const url =
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/getAllTranscripts(` +
      `meetingOrganizerUserId='${meId}',` +
      `startDateTime=${start},` +
      `endDateTime=${end}` +
      `)`;

    const data = await graphGet(url, req.session.accessToken);
    res.json({ ok: true, range: { daysPast, daysFuture, start, end }, count: data.value?.length || 0, data });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.body || String(e?.message || e) });
  }
});

/**
 * Fetch transcript content by transcriptContentUrl.
 * Usage:
 *   /api/transcripts/content?url=<encodeURIComponent(transcriptContentUrl)>
 *
 * Returns plain text (often WebVTT).
 */
app.get("/api/transcripts/content", requireLogin, async (req, res) => {
  try {
    const url = String(req.query.url || "");

    if (!url.startsWith("https://graph.microsoft.com/")) {
      return res.status(400).json({ error: "Invalid url. Must start with https://graph.microsoft.com/..." });
    }

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${req.session.accessToken}` },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const text = await r.text();
    res.type("text/plain").send(text);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Delegated transcript server running on http://localhost:${PORT}`);
  console.log(`Login: http://localhost:${PORT}/auth/login`);
});
