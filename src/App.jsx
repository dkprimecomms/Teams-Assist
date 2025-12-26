import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import MeetingsSidebar from "./components/sidebar/MeetingsSidebar";
import MainLayout from "./components/main/MainLayout";
import { fetchInvitees } from "./api/participantsApi";
import { fetchMeetingsByStatus } from "./api/meetingsApi";
import { fetchTranscript } from "./api/transcriptApi";

export default function App() {
  const [statusTab, setStatusTab] = useState("upcoming"); // for now we'll only load upcoming
  const [selectedMeetingId, setSelectedMeetingId] = useState("");

  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState("");

  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState("");

  const [transcriptText, setTranscriptText] = useState("");

  // STEP 2: load upcoming meetings from backend
 useEffect(() => {
  let cancelled = false;

  async function load() {
    setLoadingMeetings(true);
    setMeetingsError("");
    try {
      const items = await fetchMeetingsByStatus(statusTab);

      // Keep placeholders for now; transcript comes next
      const normalized = (items || []).map((m) => ({
        ...m,
        participants: m.participants || [],
        transcript: m.transcript || "",
        summary: m.summary || "",
      }));

      if (!cancelled) {
        setMeetings(normalized);
        setSelectedMeetingId(normalized?.[0]?.id || "");
      }
    } catch (e) {
      if (!cancelled) {
        setMeetings([]);
        setSelectedMeetingId("");
        setMeetingsError(String(e.message || e));
      }
    } finally {
      if (!cancelled) setLoadingMeetings(false);
    }
  }

  load();
  return () => (cancelled = true);
}, [statusTab]);


  // keep selection valid when list changes / tab changes
  useEffect(() => {
    const stillValid = meetings.find((m) => m.id === selectedMeetingId && m.status === statusTab);
    if (stillValid) return;

    const first = meetings.find((m) => m.status === statusTab);
    setSelectedMeetingId(first ? first.id : "");
  }, [statusTab, meetings, selectedMeetingId]);

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
        setParticipantsError(String(e.message || e));
      }
    } finally {
      if (!cancelled) setParticipantsLoading(false);
    }
  }

  // For now: Upcoming meetings only -> invitees
  loadInvitees();

  return () => {
    cancelled = true;
  };
}, [selectedMeetingId]);

useEffect(() => {
  if (!selectedMeetingId) return;

  const m = meetings.find((x) => x.id === selectedMeetingId);
  if (!m || m.status !== "completed") {
    setTranscriptText("");
    return;
  }

  let cancelled = false;

  (async () => {
    try {
      const vtt = await fetchTranscript(selectedMeetingId);
      if (!cancelled) setTranscriptText(vtt);
    } catch {
      if (!cancelled) setTranscriptText("");
    }
  })();

  return () => (cancelled = true);
}, [selectedMeetingId, meetings]);

const selectedRaw = useMemo(
  () => meetings.find((m) => m.id === selectedMeetingId) || null,
  [meetings, selectedMeetingId]
);

const selected = useMemo(() => {
  if (!selectedRaw) return null;
  return { ...selectedRaw, transcript: transcriptText || selectedRaw.transcript };
}, [selectedRaw, transcriptText]);



  return (
    <div className="h-screen w-full bg-slate-50">
      <div className="h-full grid grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <div className="relative">
          <MeetingsSidebar
            statusTab={statusTab}
            setStatusTab={setStatusTab}
            meetings={meetings}
            selectedMeetingId={selectedMeetingId}
            setSelectedMeetingId={setSelectedMeetingId}
          />

          {/* Loading + error overlay (small, non-blocking) */}
          {loadingMeetings && (
            <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
              Loading upcoming meetings...
            </div>
          )}
          {meetingsError && (
            <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 shadow-sm">
              {meetingsError}
            </div>
          )}
        </div>

        {/* Main */}
        <MainLayout selected={selected} />
      </div>
    </div>
  );
}
