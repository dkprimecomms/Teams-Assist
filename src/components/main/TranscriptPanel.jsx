import React from "react";
import Card from "../ui/Card";

export default function TranscriptPanel({ selected }) {
  return (
    <Card title="Transcript" subtitle="Transcript for the selected meeting (VTT for now).">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 max-h-[65vh] overflow-auto">
        <pre className="whitespace-pre-wrap break-words text-sm text-slate-900 leading-relaxed">
          {selected
            ? selected.transcript || "No transcript loaded (or transcription not available)."
            : "Select a meeting to view its transcript."}
        </pre>
      </div>
    </Card>
  );
}
