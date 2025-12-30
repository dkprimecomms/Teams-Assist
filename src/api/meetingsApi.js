import { getTeamsToken } from "./authApi";
import { postJson } from "./http";

function classify(ev) {
  const now = new Date();
  const start = new Date(ev?.start?.dateTime);
  const end = new Date(ev?.end?.dateTime);

  if (ev?.isCancelled) return "skipped";
  if (!isNaN(end) && end < now) return "completed";
  if (!isNaN(start) && start > now) return "upcoming";
  return "upcoming";
}
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

function formatWhen(ev) {
  const s = ev?.start?.dateTime || "";
  const e = ev?.end?.dateTime || "";
  return `${s} → ${e}`;
}

export async function fetchMeetingsByStatus(statusTab) {
  const token = await getTeamsToken();

  // Range: last 14 days to next 14 days
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 14);
  const end = new Date(now);
  end.setDate(now.getDate() + 14);

  const { res, data } = await postJson("/graph/events", {
    token,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  });

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || data?.detail || `Meetings fetch failed (${res.status})`);
  }

  const events = data.value || [];

  // Normalize into your UI meeting shape
  const normalized = events.map((ev) => ({
    id: ev.id,
    title: ev.subject || "(no subject)",
    when: formatWhen(ev),
    status: classify(ev), // "upcoming" | "completed" | "skipped"
    joinWebUrl: ev?.onlineMeeting?.joinUrl || "", // ✅ critical for transcript
    onlineProvider: ev?.onlineMeetingProvider || "",
    participants: [], // will be filled by invitees call (next)
    transcript: "",
    summary: "",
    raw: ev, // useful for debugging, optional
  }));

  // Your App filters by statusTab already; still safe to return all and let UI filter.
  // If you prefer, filter here:
  return normalized.filter((m) => m.status === statusTab);
}
