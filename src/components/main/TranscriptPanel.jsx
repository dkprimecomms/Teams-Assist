// src/components/main/TranscriptPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import ParticipantsIcon from "../icons/ParticipantsIcon";

function SummarizeIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h16" />
      <path d="M16 10l4 2-4 2z" />
    </svg>
  );
}

function initials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function ParticipantsGroup({ participants = [] }) {
  const items = participants.slice(0, 6);
  const extra = participants.length - items.length;
  if (!participants.length) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {items.map((p) => (
          <div
            key={(p.email || p.name) + (p.role || "")}
            className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-700"
            title={p.name || p.email}
          >
            {initials(p.name || p.email)}
          </div>
        ))}
      </div>
      {extra > 0 && <span className="text-xs text-slate-600">+{extra}</span>}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100 last:border-b-0">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-sm text-slate-900 min-w-0">{children}</div>
    </div>
  );
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, "");
}

function MeetingDetails({ selected }) {
  const raw = selected?.raw || {};

  const organizerName =
    raw?.organizer?.emailAddress?.name || selected?.organizer?.name || "";
  const organizerEmail =
    raw?.organizer?.emailAddress?.address || selected?.organizer?.email || "";

  const joinUrl = selected?.joinWebUrl || raw?.onlineMeeting?.joinUrl || "";
  const location =
    selected?.location ||
    raw?.location?.displayName ||
    raw?.locations?.[0]?.displayName ||
    "";

  const description = selected?.bodyPreview || raw?.bodyPreview || "";

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="p-4">
        <Row label="Title">
          <div className="font-semibold break-words">{selected?.title || raw?.subject || "(no subject)"}</div>
        </Row>

        <Row label="When">
          <div className="break-words">{selected?.when || ""}</div>
        </Row>

        <Row label="Organizer">
          <div className="break-words">
            {organizerName || "(unknown)"}{" "}
            {organizerEmail ? <span className="text-slate-500">• {organizerEmail}</span> : null}
          </div>
        </Row>

        <Row label="Status">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
            {selected?.status || "upcoming"}
          </span>
        </Row>

        <Row label="Provider">
          <div className="break-words">{selected?.onlineProvider || raw?.onlineMeetingProvider || "(not online)"}</div>
        </Row>

        <Row label="Location">
          <div className="break-words">{location || "(none)"}</div>
        </Row>

        <Row label="Join link">
          {joinUrl ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-slate-700 underline underline-offset-4 break-all"
            >
              Open meeting
            </a>
          ) : (
            <span className="text-slate-500">(no join link)</span>
          )}
        </Row>

        <Row label="Description">
          {description ? (
            <div className="text-sm text-slate-700 whitespace-pre-wrap break-words">
              {stripHtml(description).trim()}
            </div>
          ) : (
            <span className="text-slate-500">(no description)</span>
          )}
        </Row>
      </div>
    </div>
  );
}

export default function TranscriptPanel({ selected, participants = [], onOpenParticipants }) {
  const [tab, setTab] = useState("transcript");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setTab("transcript");
    setCollapsed(false);
  }, [selected?.id]);

  const isCompleted = selected?.status === "completed";
  const isUpcoming = selected?.status === "upcoming";

  const transcriptText = selected?.transcript || "";
  const summaryText = selected?.summary || "No summary yet.";

  const canSummarize = useMemo(() => isCompleted && transcriptText.trim().length > 0, [isCompleted, transcriptText]);

  function onSummarizeClick() {
    if (!canSummarize) return;
    setCollapsed(true);
    window.setTimeout(() => {
      setTab("summary");
      setCollapsed(false);
    }, 220);
  }

  const headerTitle = (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-2">
        {isCompleted ? (
          <>
            <button
              onClick={() => setTab("transcript")}
              className={[
                "text-sm font-semibold px-3 py-1 rounded-lg border transition",
                tab === "transcript"
                  ? "bg-white border-slate-300 text-slate-900"
                  : "bg-slate-50 border-transparent text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              Transcript
            </button>

            <button
              onClick={() => setTab("summary")}
              className={[
                "text-sm font-semibold px-3 py-1 rounded-lg border transition",
                tab === "summary"
                  ? "bg-white border-slate-300 text-slate-900"
                  : "bg-slate-50 border-transparent text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              Summary
            </button>
          </>
        ) : (
          <div className="text-sm font-semibold text-slate-900">{isUpcoming ? "Meeting Details" : "Details"}</div>
        )}
      </div>

      {/* ✅ only below lg (since RightRail exists on lg+) */}
      <div className="flex items-center gap-2 lg:hidden">
        <ParticipantsGroup participants={participants} />
        <button
          onClick={onOpenParticipants}
          className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700"
          title="Participants"
        >
          <ParticipantsIcon />
        </button>
      </div>
    </div>
  );

  return (
    <Card
      className="h-full w-full"
      bodyClassName="min-h-0"
      title={headerTitle}
      subtitle={
        isUpcoming
          ? "Details for the selected upcoming meeting."
          : isCompleted
          ? tab === "transcript"
            ? "Transcript for the selected meeting."
            : "AI summary of this meeting."
          : "Details for the selected meeting."
      }
    >
      {isUpcoming ? (
        <div className="h-full min-h-0 overflow-auto pr-1">
          <MeetingDetails selected={selected} />
        </div>
      ) : (
        <div className="relative rounded-xl border border-slate-200 bg-slate-50 h-full min-h-0 overflow-hidden flex flex-col">
          <div
            className={[
              "flex-1 min-h-0 transition-opacity duration-200 ease-in-out",
              collapsed ? "opacity-0" : "opacity-100",
            ].join(" ")}
          >
            <div className="h-full min-h-0 overflow-auto">
              <pre className="whitespace-pre-wrap break-words text-sm text-slate-900 leading-relaxed p-3">
                {!selected
                  ? "Select a meeting."
                  : isCompleted
                  ? tab === "transcript"
                    ? transcriptText || "No transcript loaded."
                    : summaryText
                  : "No transcript for this meeting status."}
              </pre>
            </div>
          </div>

          {isCompleted && tab === "transcript" && (
            <button
              onClick={onSummarizeClick}
              disabled={!canSummarize}
              title={canSummarize ? "Summarize" : "Load a transcript first"}
              className={[
                "absolute bottom-3 right-3 rounded-full border shadow-sm",
                "h-11 w-11 flex items-center justify-center",
                "transition active:translate-y-[1px]",
                canSummarize
                  ? "bg-white border-slate-300 text-slate-900 hover:bg-slate-100"
                  : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed",
              ].join(" ")}
            >
              <SummarizeIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
