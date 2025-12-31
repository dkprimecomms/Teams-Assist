// src/api/participantsApi.js
import { getTeamsToken } from "./authApi";
import { postJson } from "./http";

// Returns: [{ name, email, role, response }]
export async function fetchInvitees(eventId) {
  const token = await getTeamsToken();

  const { res, data } = await postJson("/graph/invitees", {
    token,
    eventId,
  });

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || data?.detail || `Invitees fetch failed (${res.status})`);
  }

  return data.invitees || [];
}
