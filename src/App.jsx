// src/App.js
import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import MeetingsSidebar from "./components/sidebar/MeetingsSidebar";
import MainLayout from "./components/main/MainLayout";
import { fetchInvitees } from "./api/participantsApi";
import { fetchMeetingsByStatus } from "./api/meetingsApi";
import { fetchTranscript } from "./api/transcriptApi";

export default function App() {
  const [statusTab, setStatusTab] = useState("upcoming"); // "upcoming" | "completed" | "skipped"
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

  // ✅ responsive UI toggles (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);

  // 1) Load meetings for the selected tab
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
          summary: m.summary || "",
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

  // 2) Keep selection valid when list/tab changes
  useEffect(() => {
    const stillValid = meetings.find((m) => m.id === selectedMeetingId);
    if (stillValid) return;
    setSelectedMeetingId(meetings?.[0]?.id || "");
  }, [meetings, selectedMeetingId]);

  // 3) Load participants for selected meeting
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

  // 4) Load transcript only for completed meetings with joinWebUrl
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

  // 5) Selected meeting from list
  const selectedRaw = useMemo(
    () => meetings.find((m) => m.id === selectedMeetingId) || null,
    [meetings, selectedMeetingId]
  );

  // 6) Merge participants + transcript into selected
  const selected = useMemo(() => {
    if (!selectedRaw) return null;

    return {
      ...selectedRaw,
      participants: participants || [],
      transcript: transcriptLoading
        ? "Loading transcript…"
        : transcriptError
        ? `Transcript load failed: ${transcriptError}`
        : transcriptText || "",
    };
  }, [selectedRaw, participants, transcriptText, transcriptLoading, transcriptError]);

  return (
    <div className="h-screen w-full bg-slate-50 overflow-hidden">
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
          "fixed z-50 inset-y-0 left-0 w-[320px] bg-white md:hidden",
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
            setSidebarOpen(false); // close drawer after selection
          }}
        />
      </div>

      {/* Desktop layout grid */}
      <div className="h-full min-h-0 grid grid-cols-1 md:grid-cols-[320px_1fr]">
        {/* Sidebar (desktop only) */}
        <div className="hidden md:block relative h-full min-h-0 border-r border-slate-200 bg-white">
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

        {/* Main */}
        <div className="relative h-full min-h-0 overflow-hidden">
          <MainLayout
            selected={selected}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            participantsOpen={participantsOpen}
            setParticipantsOpen={setParticipantsOpen}
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
