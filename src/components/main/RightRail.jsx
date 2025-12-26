// src/components/main/RightRail.jsx
import React from "react";
import Card from "../ui/Card";
import ParticipantsIcon from "../icons/ParticipantsIcon";

export default function RightRail({ selected }) {
  return (
    <div className="flex flex-col gap-4">
      <Card
        title={
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-900">Participants</span>
            <span className="text-slate-500">
              <ParticipantsIcon />
            </span>
          </div>
        }
        subtitle="People in the selected meeting."
      >
        {selected ? (
          <ul className="space-y-2">
            {selected.participants.map((p) => (
  <li
    key={`${p.email}-${p.role}`}
    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
  >
    <div className="font-semibold">{p.name}</div>
    <div className="text-xs text-slate-500">{p.email}</div>
    <div className="text-xs text-slate-600 mt-1">
      {p.role}{p.response ? ` • ${p.response}` : ""}
    </div>
  </li>
))}

          </ul>
        ) : (
          <div className="text-sm text-slate-500">Select a meeting to see participants.</div>
        )}
      </Card>

      <Card title="Summary" subtitle="AI summary of the transcript.">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 leading-relaxed min-h-[220px]">
          {selected ? selected.summary : "Select a meeting to view its summary."}
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Hook this to your backend:{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">/transcript</code> +{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">/summary</code>
        </div>
      </Card>
    </div>
  );
}
