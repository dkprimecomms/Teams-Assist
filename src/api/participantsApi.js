// src/api/participantsApi.js
import { getTeamsToken } from "./authApi";
import { postJson } from "./http";
import { mockParticipantsByMeetingId } from "../mocks/mockData";

const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS).toLowerCase() === "true";

export async function fetchInvitees(eventId) {
  // ✅ MOCK MODE
  if (USE_MOCKS) {
    return mockParticipantsByMeetingId?.[eventId] || [];
  }

  // ✅ REAL BACKEND MODE
  const token = await getTeamsToken();
  const { res, data } = await postJson("/graph/invitees", { token, eventId });

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || data?.detail || `Invitees fetch failed (${res.status})`);
  }

  return data.invitees || [];
}
