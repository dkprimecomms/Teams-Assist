// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import MeetingsSidebar from "./components/sidebar/MeetingsSidebar";
import MainLayout from "./components/main/MainLayout";
import { fetchInvitees } from "./api/participantsApi";
import { fetchMeetingsByStatus } from "./api/meetingsApi";
import { fetchTranscript } from "./api/transcriptApi";
import { getTeamsUser } from "./api/teamsContext";

export default function App() {
  const [statusTab, setStatusTab] = useState("upcoming"); // "upcoming" | "completed" | "skipped"
  const [selectedMeetingId, setSelectedMeetingId] = useState("");

  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState("");

  // ✅ Pagination state
  const PAGE_SIZE = 20;
  const [meetingsCursor, setMeetingsCursor] = useState(null); // current page cursor
  const [meetingsNextCursor, setMeetingsNextCursor] = useState(null); // next page cursor from backend
  const [meetingsPrevStack, setMeetingsPrevStack] = useState([]); // stack of previous cursors for Prev

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

  // Get my email (for UI alignment)
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

  // Helper to load a specific page (cursor)
  async function loadMeetingsPage({ cursor = null, resetPrev = false } = {}) {
    setLoadingMeetings(true);
    setMeetingsError("");

    if (resetPrev) {
      setMeetingsPrevStack([]);
      setMeetingsCursor(null);
      setMeetingsNextCursor(null);
    }

    try {
      // ✅ NOTE: meetingsApi must return { items, nextCursor }
      const { items, nextCursor } = await fetchMeetingsByStatus(statusTab, {
        cursor,
        pageSize: PAGE_SIZE,
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

      setMeetings(normalized);
      setSelectedMeetingId(normalized?.[0]?.id || "");
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

  // 1) Load meetings (page 1) whenever status tab changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // reset to first page on tab change
      if (!cancelled) {
        await loadMeetingsPage({ cursor: null, resetPrev: true });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTab]);

  // Pagination handlers
  async function goNextPage() {
    if (!meetingsNextCursor) return;

    // Save current cursor for Prev (null means "first page")
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

  // 2) Keep selection valid
  useEffect(() => {
    const stillValid = meetings.find((m) => m.id === selectedMeetingId);
    if (stillValid) return;
    setSelectedMeetingId(meetings?.[0]?.id || "");
  }, [meetings, selectedMeetingId]);

  // 3) Participants:
  // ✅ Upcoming: use attendees from /graph/events (instant)
  // ✅ Completed/Skipped: use invitees API
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

  // 4) Transcript ONLY for completed
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

  // 5) Selected meeting object
  const selectedRaw = useMemo(
    () => meetings.find((m) => m.id === selectedMeetingId) || null,
    [meetings, selectedMeetingId]
  );

  // 6) Merge details + participants + transcript into selected
  const selected = useMemo(() => {
    if (!selectedRaw) return null;

    return {
      ...selectedRaw,
      participants: (participants && participants.length ? participants : selectedRaw.attendees) || [],
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
      {/* Mobile overlay for sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
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
          // ✅ pagination props
          onPrevPage={goPrevPage}
          onNextPage={goNextPage}
          canPrev={canPrev}
          canNext={canNext}
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
            // ✅ pagination props
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
            selected={selected}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            participantsOpen={participantsOpen}
            setParticipantsOpen={setParticipantsOpen}
            myEmail={myEmail}
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
