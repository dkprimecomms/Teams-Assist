// src/api/transcriptApi.js
import { getTeamsToken } from "./authApi";
import { postJson } from "./http";
import { mockTranscriptByMeetingId } from "../mocks/mockData";

const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS).toLowerCase() === "true";

export async function fetchTranscript(joinWebUrlOrMeetingId) {
  // ✅ MOCK MODE: key is meetingId
  if (USE_MOCKS) {
    return (
      mockTranscriptByMeetingId?.[joinWebUrlOrMeetingId] ||
      "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\n(no transcript)\n"
    );
  }

  // ✅ REAL BACKEND MODE: expects joinWebUrl
  const token = await getTeamsToken();
  const { res, data } = await postJson("/graph/transcript", { token, joinWebUrl: joinWebUrlOrMeetingId });

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || data?.detail || `Transcript fetch failed (${res.status})`);
  }

  return data.vtt || "";
}
