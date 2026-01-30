// src/api/transcriptApi.js
import { getTeamsToken } from "./authApi";
import { postJson } from "./http";
import { mockTranscriptByMeetingId } from "../mocks/mockData";

const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS).toLowerCase() === "true";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function fetchTranscript(joinWebUrlOrMeetingId) {
  if (USE_MOCKS) {
    // ⏳ keep delay so loading animation shows
    await delay(1500);

    // ❌ FORCE ERROR for testing (pick one meeting)
    if (joinWebUrlOrMeetingId === "completed-3") {
      throw new Error("Mock transcript fetch failed");
    }

    return mockTranscriptByMeetingId?.[joinWebUrlOrMeetingId] || "";
  }

  // real backend mode
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