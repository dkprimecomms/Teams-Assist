import { getTeamsToken } from "./authApi";
import { postJson } from "./http";

function formatLocalRange12h(startUTC, endUTC) {
  if (!startUTC || !endUTC) return "";
  const start = new Date(startUTC);
  const end = new Date(endUTC);

  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  return `${fmt.format(start)} → ${fmt.format(end)}`;
}

export async function fetchMeetingsByStatus(statusTab) {
  const token = await getTeamsToken();

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 14);
  const end = new Date(now);
  end.setDate(now.getDate() + 14);

  const { res, data } = await postJson("/graph/events", {
    token,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    status: statusTab, // ✅ let backend filter + classify
  });

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || data?.detail || `Meetings fetch failed (${res.status})`);
  }

  const items = data.value || [];

  // ✅ items are already normalized by backend
  return items.map((m) => ({
    id: m.id,
    title: m.title || "(no subject)",
    when: formatLocalRange12h(m.startUTC, m.endUTC), // ✅ local + timezone + 12h
    status: m.status,                                // ✅ backend status
    joinWebUrl: m.joinWebUrl || "",
    onlineProvider: m.onlineProvider || "",
    participants: [],
    transcript: "",
    summary: "",
    raw: m,
  }));
}
