// src/api/summarizeApi.js
import { getTeamsToken } from "./authApi";
import { postJson } from "./http";

export async function summarizeTranscript({ title, transcriptVtt }) {
  const token = await getTeamsToken();

  const { res, data } = await postJson("/summarize", {
    token,
    title,
    transcriptVtt,  
  });

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.detail || `Summarize failed (${res.status})`);
  }

  return data.summary; // { purpose, takeaways, detailedSummary, actionItems }
}
