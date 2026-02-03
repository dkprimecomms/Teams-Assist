// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import MeetingsSidebar from "./components/sidebar/MeetingsSidebar";
import MainLayout from "./components/main/MainLayout";
import { fetchInvitees } from "./api/participantsApi";
import { fetchMeetingsByStatus } from "./api/meetingsApi";
import { fetchTranscript } from "./api/transcriptApi";
import { getTeamsUser } from "./api/teamsContext";

function defaultRangeISO() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 14);
  const end = new Date(now);
  end.setDate(now.getDate() + 14);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}
function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeekSunday(d) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function rangeFromPreset(preset) {
  const now = new Date();

  if (preset === "currentWeek") {
    const start = startOfWeekMonday(now);
    const end = endOfWeekSunday(now);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }

  if (preset === "previousWeek") {
    const startThisWeek = startOfWeekMonday(now);
    const start = new Date(startThisWeek);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }
  if (preset === "nextWeek") {
  const startThisWeek = startOfWeekMonday(now);
  const start = new Date(startThisWeek);
  start.setDate(start.getDate() + 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { startISO: start.toISOString(), endISO: end.toISOString() };
}


  if (preset === "currentMonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }

  if (preset === "previousMonth") {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // day 0 => last day of previous month
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

if (preset === "nextMonth") {
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999); // last day of next month
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}


 

  // custom is handled separately
  return defaultRangeISO();
}

export default function App() {
  const [statusTab, setStatusTab] = useState("upcoming");
  const [selectedMeetingId, setSelectedMeetingId] = useState("");

  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState("");

  // ✅ Date range state (used by TopBar)
  // ✅ Relative range preset + active date range
  const [rangePreset, setRangePreset] = useState("currentWeek");
  const [dateRange, setDateRange] = useState(() => rangeFromPreset("currentWeek"));


  // ✅ Date order state (used by Sidebar toggle). Default: new → old
  const [sortOrder, setSortOrder] = useState("desc");

  // ✅ Pagination state
  const PAGE_SIZE = 20;
  const [meetingsCursor, setMeetingsCursor] = useState(null);
  const [meetingsNextCursor, setMeetingsNextCursor] = useState(null);
  const [meetingsPrevStack, setMeetingsPrevStack] = useState([]);

  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState("");

  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [myEmail, setMyEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getTeamsUser();
        if (!cancelled) setMyEmail(u.email || "");
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  
  useEffect(() => {
  // Upcoming should not use past-only presets
  if (statusTab === "upcoming") {
    if (rangePreset === "previousWeek") setRangePreset("nextWeek");
    if (rangePreset === "previousMonth") setRangePreset("nextMonth");
    return;
  }

  // Completed/Skipped should not use future-only presets
  if (statusTab !== "upcoming") {
    if (rangePreset === "nextWeek") setRangePreset("previousWeek");
    if (rangePreset === "nextMonth") setRangePreset("previousMonth");
  }
}, [statusTab, rangePreset]);


  useEffect(() => {
  if (rangePreset === "custom") return; // custom uses explicit apply
  setDateRange(rangeFromPreset(rangePreset));
}, [rangePreset]);

  async function loadMeetingsPage({ cursor = null, resetPrev = false } = {}) {
    setLoadingMeetings(true);
    setMeetingsError("");

    if (resetPrev) {
      setMeetingsPrevStack([]);
      setMeetingsCursor(null);
      setMeetingsNextCursor(null);
    }

    try {
      const { items, nextCursor } = await fetchMeetingsByStatus(statusTab, {
        cursor,
        pageSize: PAGE_SIZE,
        startISO: dateRange.startISO,
        endISO: dateRange.endISO,
      });

      const normalized = (items || []).map((m) => ({
        ...m,
        participants: [],
        transcript: "",
        summary: m.summary || "",
        joinWebUrl: m.joinWebUrl || "",
        startUTC: m.startUTC || null,
        endUTC: m.endUTC || null,
      }));

      // ✅ Sort based on sidebar date order toggle
      const sorted = [...normalized].sort((a, b) => {
        const at = a?.startUTC ? new Date(a.startUTC).getTime() : 0;
        const bt = b?.startUTC ? new Date(b.startUTC).getTime() : 0;
        return sortOrder === "asc" ? at - bt : bt - at; // asc=old→new, desc=new→old
      });

      setMeetings(sorted);
      setSelectedMeetingId(sorted?.[0]?.id || "");
      setMeetingsCursor(cursor);
      setMeetingsNextCursor(nextCursor || null);
    } catch (e) {
      setMeetings([]);
      setSelectedMeetingId("");
      setMeetingsCursor(cursor);
      setMeetingsNextCursor(null);
      setMeetingsError(String(e?.message || e));
    } finally {
      setLoadingMeetings(false);
    }
  }

  // Reload meetings when tab OR date range changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await loadMeetingsPage({ cursor: null, resetPrev: true });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTab, dateRange.startISO, dateRange.endISO]);

  // ✅ Resort instantly when sortOrder changes (no refetch required)
  useEffect(() => {
    setMeetings((prev) => {
      const sorted = [...(prev || [])].sort((a, b) => {
        const at = a?.startUTC ? new Date(a.startUTC).getTime() : 0;
        const bt = b?.startUTC ? new Date(b.startUTC).getTime() : 0;
        return sortOrder === "asc" ? at - bt : bt - at;
      });
      return sorted;
    });
  }, [sortOrder]);

  async function goNextPage() {
    if (!meetingsNextCursor) return;
    setMeetingsPrevStack((s) => [...s, meetingsCursor]);
    await loadMeetingsPage({ cursor: meetingsNextCursor, resetPrev: false });
  }

  async function goPrevPage() {
    const stack = meetingsPrevStack;
    if (!stack.length) return;

    const prevCursor = stack[stack.length - 1];
    setMeetingsPrevStack(stack.slice(0, -1));

    await loadMeetingsPage({ cursor: prevCursor, resetPrev: false });
  }

  // Keep selection valid
  useEffect(() => {
    const stillValid = meetings.find((m) => m.id === selectedMeetingId);
    if (stillValid) return;
    setSelectedMeetingId(meetings?.[0]?.id || "");
  }, [meetings, selectedMeetingId]);

  // Participants logic
  useEffect(() => {
    if (!selectedMeetingId) return;

    const m = meetings.find((x) => x.id === selectedMeetingId);
    if (!m) return;

    if (m.status === "upcoming") {
      setParticipants(m.attendees || []);
      setParticipantsLoading(false);
      setParticipantsError("");
      return;
    }

    let cancelled = false;

    async function loadInvitees() {
      setParticipantsLoading(true);
      setParticipantsError("");
      try {
        const data = await fetchInvitees(selectedMeetingId);
        if (!cancelled) setParticipants(data || []);
      } catch (e) {
        if (!cancelled) {
          setParticipants([]);
          setParticipantsError(String(e?.message || e));
        }
      } finally {
        if (!cancelled) setParticipantsLoading(false);
      }
    }

    loadInvitees();
    return () => {
      cancelled = true;
    };
  }, [selectedMeetingId, meetings]);

  // Transcript only for completed
  useEffect(() => {
    if (!selectedMeetingId) return;

    const m = meetings.find((x) => x.id === selectedMeetingId);
    setTranscriptError("");

    if (!m || m.status !== "completed") {
      setTranscriptText("");
      setTranscriptLoading(false);
      return;
    }

    if (!m.joinWebUrl) {
      setTranscriptText("No join link found for this meeting (cannot fetch transcript).");
      setTranscriptLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setTranscriptLoading(true);
      setTranscriptText("");
      try {
        const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS).toLowerCase() === "true";
        const vtt = await fetchTranscript(USE_MOCKS ? m.id : m.joinWebUrl);
        if (!cancelled) setTranscriptText(vtt || "");
      } catch (e) {
        if (!cancelled) {
          setTranscriptText("");
          setTranscriptError(String(e?.message || e));
        }
      } finally {
        if (!cancelled) setTranscriptLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedMeetingId, meetings]);

  const selectedRaw = useMemo(
    () => meetings.find((m) => m.id === selectedMeetingId) || null,
    [meetings, selectedMeetingId]
  );

  const selected = useMemo(() => {
    if (!selectedRaw) return null;

    return {
      ...selectedRaw,
      participants:
        (participants && participants.length ? participants : selectedRaw.attendees) || [],
      organizer: selectedRaw.organizer || null,
      attendees: selectedRaw.attendees || [],
      location: selectedRaw.location || "",
      bodyPreview: selectedRaw.bodyPreview || "",
      transcript: transcriptLoading
        ? "Loading transcript…"
        : transcriptError
        ? `Transcript load failed: ${transcriptError}`
        : transcriptText || "",
    };
  }, [selectedRaw, participants, transcriptText, transcriptLoading, transcriptError]);

  const canPrev = meetingsPrevStack.length > 0;
  const canNext = !!meetingsNextCursor;

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-[#53dbf2] via-[#ce9eec] to-[#3a7ff2]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={[
          "fixed z-50 inset-y-0 left-0 w-[380px] md:hidden",
          "glass shadow-2xl",
          "transform transition-transform duration-200 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <MeetingsSidebar
          statusTab={statusTab}
          setStatusTab={setStatusTab}
          meetings={meetings}
          selectedMeetingId={selectedMeetingId}
          setSelectedMeetingId={(id) => {
            setSelectedMeetingId(id);
            setSidebarOpen(false);
          }}
          sortOrder={sortOrder}
          onChangeSortOrder={setSortOrder}
          onPrevPage={goPrevPage}
          onNextPage={goNextPage}
          canPrev={canPrev}
          canNext={canNext}
        />
      </div>

      <div className="h-full min-h-0 grid grid-cols-1 md:grid-cols-[400px_1fr]">
        {/* Desktop sidebar */}
        <div className="hidden md:block relative h-full min-h-0 border-r border-white/40">
          <MeetingsSidebar
            statusTab={statusTab}
            setStatusTab={setStatusTab}
            meetings={meetings}
            selectedMeetingId={selectedMeetingId}
            setSelectedMeetingId={setSelectedMeetingId}
            sortOrder={sortOrder}
            onChangeSortOrder={setSortOrder}
            onPrevPage={goPrevPage}
            onNextPage={goNextPage}
            canPrev={canPrev}
            canNext={canNext}
          />

          {loadingMeetings && (
            <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-slate-200 bg-white/95 p-3 text-sm text-slate-700 shadow-sm">
              Loading meetings...
            </div>
          )}
          {meetingsError && (
            <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 shadow-sm">
              {meetingsError}
            </div>
          )}
        </div>

        {/* Main */}
        <div className="relative h-full min-h-0 overflow-hidden">
          <MainLayout
            statusTab={statusTab}
            selected={selected}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            participantsOpen={participantsOpen}
            setParticipantsOpen={setParticipantsOpen}
            myEmail={myEmail}

            rangePreset={rangePreset}
            onChangeRangePreset={setRangePreset}
            dateRange={dateRange}
            onApplyCustomRange={(r) => {
              setRangePreset("custom");
              setDateRange(r);
            }}
            onResetRange={() => {
              setRangePreset("currentMonth");
              setDateRange(rangeFromPreset("currentMonth"));
            }}
          />

        </div>
      </div>
    </div>
  );
}
