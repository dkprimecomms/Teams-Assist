// src/App.js
import React, { useEffect, useMemo, useState } from "react";
import MeetingsSidebar from "./components/sidebar/MeetingsSidebar";
import MainLayout from "./components/main/MainLayout";
import { fetchInvitees } from "./api/participantsApi";
import { fetchMeetingsByStatus } from "./api/meetingsApi";
import { fetchTranscript } from "./api/transcriptApi";
import { getTeamsUser } from "./api/teamsContext";
import "./index.css";
function defaultRangeISO() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 14);
  const end = new Date(now);
  end.setDate(now.getDate() + 14);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export default function App() {
  const [statusTab, setStatusTab] = useState("upcoming");
  const [selectedMeetingId, setSelectedMeetingId] = useState("");

  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState("");

  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState("");

  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");

  // ✅ responsive toggles
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [myEmail, setMyEmail] = useState("");

  // ✅ global filters
  const [dateRange, setDateRange] = useState(() => defaultRangeISO());
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" | "desc"

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getTeamsUser();
        if (!cancelled) setMyEmail(u.email || "");
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 1) Load meetings (status + date range)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingMeetings(true);
      setMeetingsError("");

      try {
        const items = await fetchMeetingsByStatus(statusTab, {
          startISO: dateRange?.startISO,
          endISO: dateRange?.endISO,
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

        // sort by startUTC
        normalized.sort((a, b) => {
          const at = a.startUTC ? new Date(a.startUTC).getTime() : 0;
          const bt = b.startUTC ? new Date(b.startUTC).getTime() : 0;
          return sortOrder === "asc" ? at - bt : bt - at;
        });

        if (!cancelled) {
          setMeetings(normalized);

          // ✅ keep current selection if it still exists; otherwise select first
          const stillThere = normalized.some((m) => m.id === selectedMeetingId);
          setSelectedMeetingId(stillThere ? selectedMeetingId : normalized?.[0]?.id || "");
        }
      } catch (e) {
        if (!cancelled) {
          setMeetings([]);
          setSelectedMeetingId("");
          setMeetingsError(String(e?.message || e));
        }
      } finally {
        if (!cancelled) setLoadingMeetings(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // ✅ include selectedMeetingId so we can preserve it
  }, [statusTab, dateRange?.startISO, dateRange?.endISO, sortOrder, selectedMeetingId]);

  // 2) Participants
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

  // 3) Transcript ONLY for completed
  useEffect(() => {
    if (!selectedMeetingId) return;

    const m = meetings.find((x) => x.id === selectedMeetingId);
    setTranscriptError("");

    if (!m) {
      setTranscriptText("");
      setTranscriptLoading(false);
      return;
    }

    if (m.status !== "completed") {
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

  // Selected meeting object
  const selectedRaw = useMemo(
    () => meetings.find((m) => m.id === selectedMeetingId) || null,
    [meetings, selectedMeetingId]
  );

  // Merge details + participants + transcript into selected
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

  // Filters callbacks used by top bars in MainLayout
  function handleApplyFilters({ startISO, endISO, sortOrder: nextSort }) {
    setDateRange({
      startISO: startISO || defaultRangeISO().startISO,
      endISO: endISO || defaultRangeISO().endISO,
    });
    setSortOrder(nextSort || "asc");
  }

  function handleResetFilters() {
    setDateRange(defaultRangeISO());
    setSortOrder("asc");
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-[#53dbf2] via-[#ce9eec] to-[#3a7ff2]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
        />
      </div>

      <div className="h-full min-h-0 grid grid-cols-1 md:grid-cols-[380px_1fr]">
        {/* Sidebar (desktop) */}
        <div className="hidden md:block relative h-full min-h-0 border-r border-white/40">
          <MeetingsSidebar
            statusTab={statusTab}
            setStatusTab={setStatusTab}
            meetings={meetings}
            selectedMeetingId={selectedMeetingId}
            setSelectedMeetingId={setSelectedMeetingId}
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
            selected={selected}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            participantsOpen={participantsOpen}
            setParticipantsOpen={setParticipantsOpen}
            myEmail={myEmail}
            dateRange={dateRange}
            sortOrder={sortOrder}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
          />

          {participantsLoading && (
            <div className="absolute top-3 right-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
              Loading participants...
            </div>
          )}
          {participantsError && (
            <div className="absolute top-3 right-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 shadow-sm">
              {participantsError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
