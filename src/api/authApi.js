import * as microsoftTeams from "@microsoft/teams-js";

let cachedToken = null;

export async function getTeamsToken() {
  if (cachedToken) return cachedToken;

  await microsoftTeams.app.initialize();

  cachedToken = await new Promise((resolve, reject) => {
    microsoftTeams.authentication.getAuthToken({
      successCallback: (token) => resolve(token),
      failureCallback: (err) => reject(err),
    });
  });

  return cachedToken;
}

export function clearTeamsToken() {
  cachedToken = null;
}
