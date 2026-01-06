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

  // ✅ signed-in user email to decide RIGHT side in chat
  const [meEmail, setMeEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);


  // ✅ Fetch whoami once
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

  // 4) Load transcript ONLY for completed meetings with joinWebUrl
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

  // 5) selected meeting object
  const selectedRaw = useMemo(
    () => meetings.find((m) => m.id === selectedMeetingId) || null,
    [meetings, selectedMeetingId]
  );

  // 6) merge
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
  <div className="h-[100dvh] w-full bg-slate-50 overflow-hidden relative">
    <div className="h-full grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-0">
      
      {/* Sidebar (Desktop only) */}
      <div className="relative h-full min-h-0 hidden lg:block">
        <MeetingsSidebar
          statusTab={statusTab}
          setStatusTab={setStatusTab}
          meetings={meetings}
          selectedMeetingId={selectedMeetingId}
          setSelectedMeetingId={setSelectedMeetingId}
        />
        {/* loading/errors as before */}
      </div>

      {/* Main */}
      <div className="relative h-full min-h-0 overflow-hidden">
        <MainLayout
          selected={selected}
          meEmail={meEmail}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        {/* participantsLoading / participantsError as before */}
      </div>
    </div>

    {/* ✅ MOVE DRAWER HERE: OUTSIDE GRID */}
    <div className="lg:hidden">
      {/* Backdrop */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/30 transition-opacity",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Drawer */}
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
      </div>
    </div>
  </div>
);

}
