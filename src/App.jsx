import { useEffect } from "react";
import * as microsoftTeams from "@microsoft/teams-js";

export default function App() {
  useEffect(() => {
    (async () => {
      await microsoftTeams.app.initialize();

      microsoftTeams.authentication.getAuthToken({
        successCallback: (token) => {
          console.log("✅ Teams SSO token received. Length:", token.length);
        },
        failureCallback: (err) => {
          console.error("❌ getAuthToken failed:", err);
        },
      });
    })();
  }, []);

  return <div>TeamsAssist</div>;
}
