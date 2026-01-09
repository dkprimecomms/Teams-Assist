// src/api/teamsContext.js
import * as microsoftTeams from "@microsoft/teams-js";

let cachedUser = null;

export async function getTeamsUser() {
  if (cachedUser) return cachedUser;

  await microsoftTeams.app.initialize();
  const ctx = await microsoftTeams.app.getContext();

  const email =
    ctx?.user?.userPrincipalName ||
    ctx?.user?.email ||
    ctx?.userPrincipalName || // older shapes
    "";

  cachedUser = {
    email: String(email || "").toLowerCase(),
    displayName: ctx?.user?.displayName || "",
    context: ctx,
  };

  return cachedUser;
}

export function clearTeamsUser() {
  cachedUser = null;
}
