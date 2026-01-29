// src/api/transcriptApi.js
import { getTeamsToken } from "./authApi";
import { postJson } from "./http";
import { mockTranscriptByMeetingId } from "../mocks/mockData";

const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS).toLowerCase() === "true";

export async function fetchTranscript(joinWebUrlOrMeetingId) {
  // ✅ MOCK MODE: key is meetingId
  if (USE_MOCKS) {
    // IMPORTANT: If transcript is not available, return EMPTY STRING
    // so TranscriptPanel will show your "No transcript available" animation.
    return mockTranscriptByMeetingId?.[joinWebUrlOrMeetingId] || "";
  }

  // ✅ REAL BACKEND MODE: expects joinWebUrl
  const token = await getTeamsToken();
  const { res, data } = await postJson("/graph/transcript", {
    token,
    joinWebUrl: joinWebUrlOrMeetingId,
  });

  if (!res.ok || !data.ok) {
    throw new Error(
      data?.error || data?.detail || `Transcript fetch failed (${res.status})`
    );
  }

  return data.vtt || "";
}
