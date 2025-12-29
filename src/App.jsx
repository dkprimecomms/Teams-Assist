import { useEffect, useState } from "react";
import * as microsoftTeams from "@microsoft/teams-js";

export default function App() {
  const [status, setStatus] = useState("Starting…");
  const [details, setDetails] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // If not running inside Teams, this still initializes but getAuthToken will fail.
        await microsoftTeams.app.initialize();

        setStatus("Requesting SSO token…");

        microsoftTeams.authentication.getAuthToken({
          successCallback: (token) => {
            setStatus("✅ SSO OK (token received)");
            setDetails(`Token length: ${token.length}`);

            // Optional: show audience to confirm it matches api://<client-id>
            try {
              const payload = JSON.parse(atob(token.split(".")[1]));
              setDetails((d) => `${d}\nAud: ${payload.aud}\nUPN: ${payload.preferred_username || ""}`);
            } catch {}
          },
          failureCallback: (err) => {
            setStatus("❌ SSO FAILED");
            setDetails(typeof err === "string" ? err : JSON.stringify(err));
          },
        });
      } catch (e) {
        setStatus("❌ Teams SDK init failed");
        setDetails(String(e?.message || e));
      }
    })();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h2>TeamsAssist</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {status}
        {"\n"}
        {details}
      </pre>
      <p style={{ opacity: 0.7 }}>
        Note: SSO only succeeds when this page is opened inside Microsoft Teams as a tab.
      </p>
    </div>
  );
}
