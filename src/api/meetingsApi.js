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

function defaultRangeISO() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 14);
  const end = new Date(now);
  end.setDate(now.getDate() + 14);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export async function fetchMeetingsByStatus(statusTab, { startISO = null, endISO = null } = {}) {
  const range = {
    startISO: startISO || defaultRangeISO().startISO,
    endISO: endISO || defaultRangeISO().endISO,
  };

  if (USE_MOCKS) {
    const s = new Date(range.startISO).getTime();
    const e = new Date(range.endISO).getTime();

    const all = (mockMeetings || [])
      .filter((m) => m.status === statusTab)
      .filter((m) => {
        const t = m.startUTC ? new Date(m.startUTC).getTime() : null;
        if (t == null) return true;
        return t >= s && t <= e;
      });

    return all.map((m) => ({
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
  }

  const token = await getTeamsToken();

  const { res, data } = await postJson("/graph/events", {
    token,
    startISO: range.startISO,
    endISO: range.endISO,
    status: statusTab,
  });

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || data?.detail || `Meetings fetch failed (${res.status})`);
  }

  const items = data.value || [];
  return items.map((m) => ({
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
}
