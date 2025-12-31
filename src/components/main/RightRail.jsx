import React from "react";
import Card from "../ui/Card";
import ParticipantsIcon from "../icons/ParticipantsIcon";

export default function RightRail({ selected }) {
  const participants = selected?.participants || [];

  return (
    <div className="flex flex-col gap-4">
      <Card
        title={
          <div className="flex items-center gap-2">
            <ParticipantsIcon className="h-5 w-5 text-slate-700" />
            <span className="text-base font-semibold text-slate-900">Participants</span>
            <span className="text-xs text-slate-500">({participants.length})</span>
          </div>
        }
        subtitle="People in the selected meeting."
      >
        {!selected ? (
          <div className="text-sm text-slate-500">Select a meeting to see participants.</div>
        ) : participants.length === 0 ? (
          <div className="text-sm text-slate-500">
            No participants loaded yet. (Next: wire invitees from backend.)
          </div>
        ) : (
          <ul className="space-y-2">
            {participants.map((p, idx) => (
              <li
                key={`${p.email || idx}-${p.role || "attendee"}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <div className="flex items-start gap-2">
                  {/* Small icon per participant */}
                  <ParticipantsIcon className="h-4 w-4 text-slate-500 mt-0.5" />

                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.name || "(no name)"}</div>
                    {p.email ? (
                      <div className="text-xs text-slate-500 truncate">{p.email}</div>
                    ) : null}
                    <div className="text-xs text-slate-600 mt-1">
                      {p.role || "attendee"}
                      {p.response ? ` • ${p.response}` : ""}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Summary" subtitle="AI summary of the transcript.">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 leading-relaxed min-h-[220px]">
          {selected ? selected.summary || "No summary yet." : "Select a meeting to view its summary."}
        </div>
      </Card>
    </div>
  );
}
