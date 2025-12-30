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

  // Load meetings for the selected status tab
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingMeetings(true);
      setMeetingsError("");
      try {
        const items = await fetchMeetingsByStatus(statusTab);

        // Normalize: keep placeholders for now; transcript loaded separately
        const normalized = (items || []).map((m) => ({
          ...m,
          participants: m.participants || [],
          transcript: m.transcript || "",
          summary: m.summary || "",
          joinWebUrl: m.joinWebUrl || "", // ✅ required for transcript
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

  // Keep selection valid when list changes / tab changes
  useEffect(() => {
    const stillValid = meetings.find((m) => m.id === selectedMeetingId && m.status === statusTab);
    if (stillValid) return;

    const first = meetings.find((m) => m.status === statusTab);
    setSelectedMeetingId(first ? first.id : "");
  }, [statusTab, meetings, selectedMeetingId]);

  // Load invitees for the selected meeting (we return [] for now in participantsApi)
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

  // Load transcript only for completed meetings
  useEffect(() => {
    if (!selectedMeetingId) return;

    const m = meetings.find((x) => x.id === selectedMeetingId);
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
        // ✅ IMPORTANT: transcript is fetched using joinWebUrl (not meeting id)
        const vtt = await fetchTranscript(m.joinWebUrl);
        if (!cancelled) setTranscriptText(vtt || "");
      } catch (e) {
        if (!cancelled) setTranscriptText(`Transcript load failed: ${String(e?.message || e)}`);
      } finally {
        if (!cancelled) setTranscriptLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedMeetingId, meetings]);

  // Selected meeting object from list
  const selectedRaw = useMemo(
    () => meetings.find((m) => m.id === selectedMeetingId) || null,
    [meetings, selectedMeetingId]
  );

  // Merge transcript + participants into selected
  const selected = useMemo(() => {
    if (!selectedRaw) return null;

    return {
      ...selectedRaw,
      participants: participants || [],
      transcript: transcriptLoading
        ? "Loading transcript…"
        : transcriptText || selectedRaw.transcript || "",
    };
  }, [selectedRaw, participants, transcriptText, transcriptLoading]);

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
        <div className="relative">
          <MainLayout selected={selected} />

          {/* Optional participants loading/errors as small non-blocking overlays */}
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
