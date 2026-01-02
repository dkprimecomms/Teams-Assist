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

export default function TranscriptPanel({ selected, participants = [], onOpenParticipants }) {
  const [tab, setTab] = useState("transcript");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setTab("transcript");
    setCollapsed(false);
  }, [selected?.id]);

  const transcriptText = selected?.transcript || "";
  const summaryText = selected?.summary || "No summary yet.";

  const canSummarize = useMemo(
    () => !!selected && transcriptText.trim().length > 0,
    [selected, transcriptText]
  );

  function onSummarizeClick() {
    if (!canSummarize) return;
    setCollapsed(true);
    window.setTimeout(() => {
      setTab("summary");
      setCollapsed(false);
    }, 220);
  }

  const content = !selected
    ? "Select a meeting to view its transcript."
    : tab === "transcript"
    ? transcriptText || "No transcript loaded."
    : summaryText;

  return (
    <Card
      className="h-full w-full"
      bodyClassName="min-h-0"
      title={
        <div className="flex items-center justify-between gap-3 w-full">
          {/* Left: Tabs */}
          <div className="flex items-center gap-2">
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
          </div>

          {/* Right: grouped participants + single icon */}
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
      }
      subtitle={tab === "transcript" ? "Transcript for the selected meeting." : "AI summary of this meeting."}
    >
      <div className="relative rounded-xl border border-slate-200 bg-slate-50 h-full min-h-0 overflow-hidden flex flex-col">
        <div
          className={[
            "flex-1 min-h-0 transition-opacity duration-200 ease-in-out",
            collapsed ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          <div className="h-full min-h-0 overflow-auto">
            <pre className="whitespace-pre-wrap break-words text-sm text-slate-900 leading-relaxed p-3">
              {content}
            </pre>
          </div>
        </div>

        {tab === "transcript" && (
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
    </Card>
  );
}
