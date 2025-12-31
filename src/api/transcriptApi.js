import { getTeamsToken } from "./authApi";
import { postJson } from "./http";

export async function fetchTranscript(joinWebUrl) {
  const token = await getTeamsToken();

  const { res, data } = await postJson("/graph/transcript", {
    token,
    joinWebUrl,
  });

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || data?.detail || `Transcript fetch failed (${res.status})`);
  }

  return data.vtt || "";
}
