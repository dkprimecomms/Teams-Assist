import React from "react";
import Card from "../ui/Card";

export default function TranscriptPanel({ selected }) {
  return (
    <Card title="Transcript" subtitle="Transcript for the selected meeting (VTT for now).">
      {/* Make the card content fill available height */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 h-[calc(100vh-190px)] overflow-hidden">
        {/* Scroll only the transcript text */}
        <pre className="whitespace-pre-wrap break-words text-sm text-slate-900 leading-relaxed h-full overflow-auto">
          {selected
            ? selected.transcript || "No transcript loaded (or transcription not available)."
            : "Select a meeting to view its transcript."}
        </pre>
      </div>
    </Card>
  );
}
