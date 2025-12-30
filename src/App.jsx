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

export default function App() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Lambda Function URL

  const [status, setStatus] = useState("Starting…");
  const [token, setToken] = useState("");
  const [claims, setClaims] = useState(null);

  const [backendStatus, setBackendStatus] = useState("");
  const [backendResponse, setBackendResponse] = useState("");
  const [error, setError] = useState("");

  const tokenSummary = useMemo(() => {
    if (!token) return "";
    return `Token length: ${token.length}\nAud: ${claims?.aud || ""}\nUPN: ${claims?.preferred_username || ""}`;
  }, [token, claims]);

  const claimsPretty = useMemo(() => {
    if (!claims) return "";
    // show only useful claims
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

  async function callBackendWhoAmI(ssoToken) {
    setError("");
    setBackendResponse("");
    if (!API_BASE_URL) {
      setBackendStatus("❌ VITE_API_BASE_URL not set");
      setBackendResponse("Add VITE_API_BASE_URL in your .env and redeploy/restart.");
      return;
    }

    setBackendStatus("Calling backend /whoami …");

    try {
      const base = (API_BASE_URL || "").replace(/\/+$/, "");
const res = await fetch(`${base}/whoami`, {
  method: "GET",
  headers: { Authorization: `Bearer ${ssoToken}` },
});

      const text = await res.text();
      setBackendStatus(`Backend HTTP ${res.status}`);

      // Pretty-print JSON if possible
      try {
        const json = JSON.parse(text);
        setBackendResponse(JSON.stringify(json, null, 2));
      } catch {
        setBackendResponse(text);
      }
    } catch (e) {
      setBackendStatus("❌ Backend call failed (likely CORS or network)");
      setError(String(e?.message || e));
    }
  }

  async function refreshTokenAndCallBackend() {
    setError("");
    setBackendResponse("");
    setBackendStatus("");
    try {
      setStatus("Initializing Teams SDK…");
      const tok = await getTeamsSsoToken();

      setToken(tok);
      const decoded = decodeJwtPayload(tok);
      setClaims(decoded);

      setStatus("✅ SSO OK (token received)");
      await callBackendWhoAmI(tok);
    } catch (e) {
      setStatus("❌ SSO FAILED");
      setError(typeof e === "string" ? e : JSON.stringify(e));
    }
  }

  useEffect(() => {
    refreshTokenAndCallBackend();
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
          Endpoint:{" "}
          <code>{API_BASE_URL ? `${API_BASE_URL}/whoami` : "Set VITE_API_BASE_URL in .env"}</code>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            onClick={() => token && callBackendWhoAmI(token)}
            disabled={!token}
            style={{ padding: "8px 12px", cursor: token ? "pointer" : "not-allowed" }}
          >
            Retry backend (/whoami)
          </button>

          <button
            onClick={refreshTokenAndCallBackend}
            style={{ padding: "8px 12px", cursor: "pointer" }}
          >
            Refresh token + call backend
          </button>
        </div>

        <div style={{ fontWeight: 600 }}>{backendStatus || "Waiting…"}</div>

        <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 10, borderRadius: 8, marginTop: 8 }}>
          {backendResponse || "(no response yet)"}
        </pre>
      </div>
    </div>
  );
}
