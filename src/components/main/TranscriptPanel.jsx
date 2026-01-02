// src/components/main/TranscriptPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";

function SummarizeIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h16" />
      <path d="M16 10l4 2-4 2z" />
    </svg>
  );
}

export default function TranscriptPanel({ selected }) {
  // tabs: "transcript" | "summary"
  const [tab, setTab] = useState("transcript");
  const [collapsed, setCollapsed] = useState(false);

  // Reset UI when meeting changes
  useEffect(() => {
    setTab("transcript");
    setCollapsed(false);
  }, [selected?.id]);

  const transcriptText = selected?.transcript || "";
  const summaryText = selected?.summary || "No summary yet.";

  const canSummarize = useMemo(() => {
    // you can tighten this rule (ex: only completed meetings)
    return !!selected && !!transcriptText && transcriptText.trim().length > 0;
  }, [selected, transcriptText]);

  function onSummarizeClick() {
    if (!canSummarize) return;

    // 1) collapse transcript with animation
    setCollapsed(true);

    // 2) after the collapse starts, switch to summary tab and show it
    // (small delay makes the animation feel intentional)
    window.setTimeout(() => {
      setTab("summary");
      setCollapsed(false);
    }, 220);
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          {/* Tabs */}
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
      }
      subtitle={tab === "transcript" ? "Transcript for the selected meeting." : "AI summary of this meeting."}
    >
      <div className="relative rounded-xl border border-slate-200 bg-slate-50">
        {/* Content container (animation) */}
        <div
          className={[
            "transition-all duration-200 ease-in-out overflow-hidden",
            collapsed ? "max-h-0 opacity-0" : "max-h-[65vh] opacity-100",
          ].join(" ")}
        >
          <pre className="whitespace-pre-wrap break-words text-sm text-slate-900 leading-relaxed p-3">
            {selected
              ? tab === "transcript"
                ? transcriptText || "No transcript loaded."
                : summaryText
              : "Select a meeting to view its transcript."}
          </pre>
        </div>

        {/* Summarize floating button (bottom-right) */}
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
