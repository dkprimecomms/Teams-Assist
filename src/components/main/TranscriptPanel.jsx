// src/components/main/TranscriptPanel.jsx
import React from "react";
import Card from "../ui/Card";

export default function TranscriptPanel({ selected }) {
  const isEmpty = !selected?.transcript;

  return (
    <Card title="Transcript" subtitle="Transcript for the selected meeting (VTT for now).">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <pre className="whitespace-pre-wrap break-words text-sm text-slate-900 leading-relaxed min-h-[520px]">
          {selected
            ? isEmpty
              ? "No transcript loaded (or transcription not available for this meeting)."
              : selected.transcript
            : "Select a meeting to view its transcript."}
        </pre>

        {selected?.status !== "completed" && selected && (
          <div className="mt-3 text-xs text-slate-500">
            Transcripts usually exist only for <span className="font-medium">completed</span> meetings.
          </div>
        )}
      </div>
    </Card>
  );
}
