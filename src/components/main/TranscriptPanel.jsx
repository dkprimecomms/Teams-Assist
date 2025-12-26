// src/components/main/TranscriptPanel.jsx
import React from "react";
import Card from "../ui/Card";

export default function TranscriptPanel({ selected }) {
  return (
    <Card title="Transcript" subtitle="Transcript for the selected meeting.">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <pre className="whitespace-pre-wrap break-words text-sm text-slate-900 leading-relaxed min-h-[520px]">
          {selected ? selected.transcript : "Select a meeting to view its transcript."}
        </pre>
      </div>
    </Card>
  );
}
