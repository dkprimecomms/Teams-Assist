// src/api/summaryApi.js
import { getTeamsToken } from "./authApi";
import { postJson } from "./http";

export async function fetchSummaryForMeeting(meeting) {
  const token = await getTeamsToken();

  const transcriptVtt = meeting?.transcript || "";
  if (!transcriptVtt || transcriptVtt.startsWith("Loading") || transcriptVtt.startsWith("Transcript load failed")) {
    throw new Error("Transcript not available yet.");
  }

  const { res, data } = await postJson("/summarize", {
    token,
    title: meeting?.title || "",
    transcriptVtt, // ✅ required by backend
  });

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.detail || `Summarize failed (${res.status})`);
  }

  return data.summary;
}
