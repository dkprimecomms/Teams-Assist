// src/api/meetingsApi.js
import { getTeamsToken } from "./authApi";
import { postJson } from "./http";
import { mockMeetings } from "../mocks/mockData";

const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS).toLowerCase() === "true";

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

export async function fetchMeetingsByStatus(
  statusTab,
  { cursor = null, pageSize = 20, startISO = null, endISO = null } = {}
) {
  // ✅ MOCK MODE
  if (USE_MOCKS) {
    const all = (mockMeetings || []).filter((m) => m.status === statusTab);

    const offset = cursor ? Number(cursor) : 0;
    const page = all.slice(offset, offset + pageSize);

    const nextOffset = offset + pageSize;
    const nextCursor = nextOffset < all.length ? String(nextOffset) : null;

    const items = page.map((m) => ({
      id: m.id,
      title: m.title || "(no subject)",
      subject: m.title || "(no subject)",
      startUTC: m.startUTC || null,
      endUTC: m.endUTC || null,
      recurrence: m.recurrence || null,
      when: formatLocalRange12h(m.startUTC, m.endUTC),
      status: m.status,
      joinWebUrl: m.joinWebUrl || "",
      onlineProvider: m.onlineProvider || "",
      organizer: m.organizer || null,
      attendees: m.attendees || [],
      location: m.location || "",
      bodyPreview: m.bodyPreview || "",
      participants: [],
      transcript: "",
      summary: m.summary || "",
      raw: m.raw || m,
    }));

    return { items, nextCursor };
  }

  // ✅ REAL BACKEND MODE
  const token = await getTeamsToken();

  // Default window: -14 to +14 days (unless UI passes startISO/endISO)
  const now = new Date();

  const start = startISO ? new Date(startISO) : new Date(now);
  if (!startISO) start.setDate(now.getDate() - 14);

  const end = endISO ? new Date(endISO) : new Date(now);
  if (!endISO) end.setDate(now.getDate() + 14);

  const { res, data } = await postJson("/graph/events", {
    token,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    status: statusTab,
    cursor,
    pageSize,
  });

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || data?.detail || `Meetings fetch failed (${res.status})`);
  }

  const rawItems = data.value || [];
  const nextCursor = data.nextCursor || null;

  const items = rawItems.map((m) => ({
    id: m.id,
    title: m.title || "(no subject)",
    subject: m.raw?.subject || m.title || "(no subject)",
    startUTC: m.startUTC || null,
    endUTC: m.endUTC || null,
    recurrence: m.raw?.recurrence || null,
    when: formatLocalRange12h(m.startUTC, m.endUTC),
    status: m.status,
    joinWebUrl: m.joinWebUrl || "",
    onlineProvider: m.onlineProvider || "",
    organizer: m.organizer || null,
    attendees: m.attendees || [],
    location: m.location || "",
    bodyPreview: m.bodyPreview || "",
    participants: [],
    transcript: "",
    summary: m.summary || "",
    raw: m.raw || m,
  }));

  return { items, nextCursor };
}