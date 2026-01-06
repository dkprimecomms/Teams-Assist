// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import MeetingsSidebar from "./components/sidebar/MeetingsSidebar";
import MainLayout from "./components/main/MainLayout";
import { fetchInvitees } from "./api/participantsApi";
import { fetchMeetingsByStatus } from "./api/meetingsApi";
import { fetchTranscript } from "./api/transcriptApi";

// ✅ for whoami
import { getTeamsToken } from "./api/authApi";
import { postJson } from "./api/http";

// ✅ summarize
import { summarizeTranscript } from "./api/summarizeApi";

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

  // ✅ signed-in user email
  const [meEmail, setMeEmail] = useState("");

  // ✅ Sidebar drawer (tablet/mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ Store summaries by meeting id
  const [summaryByMeetingId, setSummaryByMeetingId] = useState({});

  // ✅ whoami once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getTeamsToken();
        const { res, data } = await postJson("/whoami", { token });
        if (!cancelled && res.ok && data?.ok && data?.upn) {
          setMeEmail(String(data.upn).toLowerCase());
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 1) Load meetings for selected tab
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingMeetings(true);
      setMeetingsError("");
      try {
        const items = await fetchMeetingsByStatus(statusTab);

        const normalized = (items || []).map((m) => ({
          ...m,
          participants: [],
          transcript: "",
          joinWebUrl: m.joinWebUrl || "",
          startUTC: m.startUTC || null,
          endUTC: m.endUTC || null,
        }));

        if (!cancelled) {
          setMeetings(normalized);
          setSelectedMeetingId(normalized?.[0]?.id || "");
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
  }, [statusTab]);

  // 2) Keep selection valid
  useEffect(() => {
    const stillValid = meetings.find((m) => m.id === selectedMeetingId);
    if (stillValid) return;
    setSelectedMeetingId(meetings?.[0]?.id || "");
  }, [meetings, selectedMeetingId]);

  // 3) Load participants
  useEffect(() => {
    if (!selectedMeetingId) return;

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
  }, [selectedMeetingId]);

  // 4) Load transcript for completed meetings
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

  // 5) selected meeting raw object
  const selectedRaw = useMemo(
    () => meetings.find((m) => m.id === selectedMeetingId) || null,
    [meetings, selectedMeetingId]
  );

  // ✅ Summarize fetcher (called from TranscriptPanel)
  async function fetchSummaryForMeeting(meeting) {
    if (!meeting?.id) throw new Error("Missing meeting");
    if (summaryByMeetingId[meeting.id]) return summaryByMeetingId[meeting.id];

    // ✅ Use the transcript currently loaded in App
    const transcriptVtt = transcriptText || "";
    if (!transcriptVtt) throw new Error("Transcript is empty");

    const summary = await summarizeTranscript({
      title: meeting.title || "Meeting",
      transcriptVtt,
    });

    setSummaryByMeetingId((prev) => ({ ...prev, [meeting.id]: summary }));
    return summary;
  }

  // 6) merge selected data
  const selected = useMemo(() => {
    if (!selectedRaw) return null;

    const mergedTranscript =
      transcriptLoading
        ? "Loading transcript…"
        : transcriptError
        ? `Transcript load failed: ${transcriptError}`
        : transcriptText || "";

    return {
      ...selectedRaw,
      participants: participants || [],
      transcript: mergedTranscript,
      summaryObj: summaryByMeetingId[selectedRaw.id] || null,
    };
  }, [
    selectedRaw,
    participants,
    transcriptText,
    transcriptLoading,
    transcriptError,
    summaryByMeetingId,
  ]);

  return (
    <div className="h-[100dvh] w-full bg-slate-50 overflow-hidden">
      <div className="h-full grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-0">
        {/* Sidebar (Desktop) */}
        <div className="relative h-full min-h-0 hidden lg:block">
          <MeetingsSidebar
            statusTab={statusTab}
            setStatusTab={setStatusTab}
            meetings={meetings}
            selectedMeetingId={selectedMeetingId}
            setSelectedMeetingId={setSelectedMeetingId}
          />

          {loadingMeetings && (
            <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
              Loading meetings...
            </div>
          )}

          {meetingsError && (
            <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 shadow-sm">
              {meetingsError}
            </div>
          )}
        </div>

        {/* Sidebar Drawer (Tablet/Mobile) */}
        <div className="lg:hidden">
          <div
            className={[
              "fixed inset-0 z-40 bg-black/30 transition-opacity",
              sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            ].join(" ")}
            onClick={() => setSidebarOpen(false)}
          />

          <div
            className={[
              "fixed top-0 left-0 bottom-0 z-50 w-[320px] max-w-[90vw] bg-white shadow-xl",
              "transition-transform duration-300 ease-out",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900">Meetings</div>
                <div className="text-xs text-slate-500">Filter and select a meeting</div>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="h-[calc(100%-73px)]">
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

            {loadingMeetings && (
              <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
                Loading meetings...
              </div>
            )}

            {meetingsError && (
              <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 shadow-sm">
                {meetingsError}
              </div>
            )}
          </div>
        </div>

        {/* Main */}
        <div className="relative h-full min-h-0 overflow-hidden">
          <MainLayout
            selected={selected}
            meEmail={meEmail}
            onOpenSidebar={() => setSidebarOpen(true)}
            onFetchSummary={fetchSummaryForMeeting}
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
