// src/api/summaryApi.js
import { getTeamsToken } from "./authApi";
import { postJson } from "./http";

export async function fetchSummaryForMeeting(meeting) {
  const token = await getTeamsToken();

  const { res, data } = await postJson("/summarize", {
    token,
    title: meeting?.title || "",
    joinWebUrl: meeting?.joinWebUrl || "",
  });

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.detail || `Summarize failed (${res.status})`);
  }

  return data.summary;
}
