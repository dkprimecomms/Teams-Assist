import { useEffect, useMemo, useState } from "react";
import * as microsoftTeams from "@microsoft/teams-js";

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    // JWT uses base64url, convert to base64
    const b64url = parts[1];
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function getTeamsSsoToken() {
  await microsoftTeams.app.initialize();

  return new Promise((resolve, reject) => {
    microsoftTeams.authentication.getAuthToken({
      successCallback: (token) => resolve(token),
      failureCallback: (err) => reject(err),
    });
  });
}

function classifyMeeting(event) {
  const isCancelled = !!event.isCancelled;

  // Graph may return dateTime without timezone; still parseable
  const start = new Date(event?.start?.dateTime);
  const end = new Date(event?.end?.dateTime);
  const now = new Date();

  if (isCancelled) return "Skipped";
  if (!isNaN(end) && end < now) return "Completed";
  if (!isNaN(start) && start > now) return "Scheduled";
  return "Scheduled";
}

export default function App() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Lambda Function URL

  const [status, setStatus] = useState("Starting…");
  const [token, setToken] = useState("");
  const [claims, setClaims] = useState(null);

  const [backendStatus, setBackendStatus] = useState("");
  const [backendResponse, setBackendResponse] = useState("");
  const [error, setError] = useState("");

  const [meetings, setMeetings] = useState([]);

  // Transcript UI
  const [transcriptStatus, setTranscriptStatus] = useState("");
  const [transcriptText, setTranscriptText] = useState("");

  const tokenSummary = useMemo(() => {
    if (!token) return "";
    return `Token length: ${token.length}\nAud: ${claims?.aud || ""}\nUPN: ${claims?.preferred_username || ""}`;
  }, [token, claims]);

  const claimsPretty = useMemo(() => {
    if (!claims) return "";
    const subset = {
      aud: claims.aud,
      iss: claims.iss,
      tid: claims.tid,
      oid: claims.oid,
      name: claims.name,
      upn: claims.preferred_username,
      scp: claims.scp,
      roles: claims.roles,
      exp: claims.exp,
    };
    return JSON.stringify(subset, null, 2);
  }, [claims]);

  async function postJson(path, bodyObj) {
    if (!API_BASE_URL) {
      setBackendStatus("❌ VITE_API_BASE_URL not set");
      setBackendResponse("Add VITE_API_BASE_URL in your .env and redeploy/restart.");
      return { ok: false };
    }

    const base = (API_BASE_URL || "").replace(/\/+$/, "");
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
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

  async function callBackendWhoAmI(ssoToken) {
    setError("");
    setBackendResponse("");
    setBackendStatus("Calling backend /whoami …");

    try {
      const { res, data } = await postJson("/whoami", { token: ssoToken });
      if (!res) return;

      setBackendStatus(`Backend HTTP ${res.status}`);
      setBackendResponse(JSON.stringify(data, null, 2));
    } catch (e) {
      setBackendStatus("❌ Backend call failed");
      setError(String(e?.message || e));
    }
  }

  async function callBackendGraphMe(ssoToken) {
    setError("");
    setBackendResponse("");
    setBackendStatus("Calling backend /graph/me …");

    try {
      const { res, data } = await postJson("/graph/me", { token: ssoToken });
      if (!res) return;

      setBackendStatus(`Backend HTTP ${res.status}`);
      setBackendResponse(JSON.stringify(data, null, 2));
    } catch (e) {
      setBackendStatus("❌ Backend call failed");
      setError(String(e?.message || e));
    }
  }

  async function loadMeetings(ssoToken) {
    setError("");
    setBackendResponse("");
    setBackendStatus("Loading meetings (/graph/events) …");

    // Example range: last 14 days to next 14 days
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 14);
    const end = new Date(now);
    end.setDate(now.getDate() + 14);

    try {
      const { res, data } = await postJson("/graph/events", {
        token: ssoToken,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
      });
      if (!res) return;

      setBackendStatus(`Meetings HTTP ${res.status}`);

      if (!res.ok || !data.ok) {
        setBackendResponse(JSON.stringify(data, null, 2));
        return;
      }

      const list = data.value || [];
      setMeetings(list);
      setBackendResponse(`Loaded ${list.length} events`);
    } catch (e) {
      setBackendStatus("❌ Meetings load failed");
      setError(String(e?.message || e));
    }
  }

  async function loadTranscriptForMeeting(meeting) {
    setError("");
    setTranscriptStatus("Loading transcript…");
    setTranscriptText("");

    const joinWebUrl = meeting?.onlineMeeting?.joinUrl;
    if (!joinWebUrl) {
      setTranscriptStatus("❌ This meeting has no onlineMeeting.joinUrl (cannot fetch transcript).");
      return;
    }

    try {
      const { res, data } = await postJson("/graph/transcript", {
        token,
        joinWebUrl,
      });

      if (!res) return;

      if (!res.ok || !data.ok) {
        setTranscriptStatus(`Transcript HTTP ${res.status}`);
        setTranscriptText(JSON.stringify(data, null, 2));
        return;
      }

      setTranscriptStatus("✅ Transcript loaded (VTT)");
      setTranscriptText(data.vtt || "");
    } catch (e) {
      setTranscriptStatus("❌ Transcript fetch failed");
      setError(String(e?.message || e));
    }
  }

  async function refreshToken() {
    setError("");
    setBackendResponse("");
    setBackendStatus("");
    setTranscriptStatus("");
    setTranscriptText("");

    try {
      setStatus("Initializing Teams SDK…");
      const tok = await getTeamsSsoToken();
      setToken(tok);

      const decoded = decodeJwtPayload(tok);
      setClaims(decoded);

      setStatus("✅ SSO OK (token received)");

      // Default: verify backend token route once
      await callBackendWhoAmI(tok);
    } catch (e) {
      setStatus("❌ SSO FAILED");
      setError(typeof e === "string" ? e : JSON.stringify(e));
    }
  }

  useEffect(() => {
    refreshToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", maxWidth: 980 }}>
      <h2 style={{ margin: 0 }}>TeamsAssist</h2>
      <div style={{ opacity: 0.7, marginBottom: 12 }}>
        SSO works only when opened inside Microsoft Teams as a tab.
      </div>

      {/* SSO Card */}
      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>SSO</h3>

        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
          {status}
          {"\n"}
          {tokenSummary}
        </pre>

        {claims && (
          <>
            <div style={{ marginTop: 10, fontWeight: 600 }}>Decoded token (selected claims)</div>
            <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 10, borderRadius: 8 }}>
              {claimsPretty}
            </pre>
          </>
        )}

        {error && (
          <>
            <div style={{ marginTop: 10, fontWeight: 600, color: "crimson" }}>Error</div>
            <pre style={{ whiteSpace: "pre-wrap", background: "#fff5f5", padding: 10, borderRadius: 8 }}>
              {error}
            </pre>
          </>
        )}
      </div>

      {/* Backend Card */}
      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Backend (Lambda Function URL)</h3>

        <div style={{ marginBottom: 8 }}>
          API Base: <code>{API_BASE_URL ? API_BASE_URL : "Set VITE_API_BASE_URL in .env"}</code>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            onClick={() => token && callBackendWhoAmI(token)}
            disabled={!token}
            style={{ padding: "8px 12px", cursor: token ? "pointer" : "not-allowed" }}
          >
            Verify Token (/whoami)
          </button>

          <button
            onClick={() => token && callBackendGraphMe(token)}
            disabled={!token}
            style={{ padding: "8px 12px", cursor: token ? "pointer" : "not-allowed" }}
          >
            Test Graph (/graph/me)
          </button>

          <button
            onClick={() => token && loadMeetings(token)}
            disabled={!token}
            style={{ padding: "8px 12px", cursor: token ? "pointer" : "not-allowed" }}
          >
            Load Meetings
          </button>

          <button onClick={refreshToken} style={{ padding: "8px 12px", cursor: "pointer" }}>
            Refresh Token
          </button>
        </div>

        <div style={{ fontWeight: 600 }}>{backendStatus || "Waiting…"}</div>

        <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 10, borderRadius: 8, marginTop: 8 }}>
          {backendResponse || "(no response yet)"}
        </pre>

        {meetings.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: "12px 0 8px" }}>Meetings ({meetings.length})</h4>

            <div style={{ display: "grid", gap: 8 }}>
              {meetings.map((m) => {
                const label = classifyMeeting(m);
                const joinUrl = m?.onlineMeeting?.joinUrl;

                return (
                  <div key={m.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 600 }}>{m.subject || "(no subject)"}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
                    </div>

                    <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>
                      {m.start?.dateTime} → {m.end?.dateTime}
                    </div>

                    <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>
                      Cancelled: {String(!!m.isCancelled)}
                    </div>

                    {m.onlineMeetingProvider && (
                      <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>
                        Online: {m.onlineMeetingProvider}
                      </div>
                    )}

                    <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>
                      Join URL: {joinUrl ? "✅ Present" : "❌ Missing"}
                    </div>

                    <button
                      onClick={() => loadTranscriptForMeeting(m)}
                      style={{ padding: "6px 10px", cursor: "pointer", marginTop: 8 }}
                    >
                      View Transcript
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {transcriptStatus && (
          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: "12px 0 8px" }}>Transcript</h4>
            <div style={{ fontWeight: 600 }}>{transcriptStatus}</div>
            <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 10, borderRadius: 8, marginTop: 8 }}>
              {transcriptText || "(no transcript yet)"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
