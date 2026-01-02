import React from "react";

export default function MeetingRow({ meeting, active, onSelect }) {
  const base =
    "w-full text-left rounded-xl px-3 py-2 bg-white hover:bg-slate-50 transition border border-slate-200";

  const activeRing =
    meeting.status === "completed"
      ? "ring-2 ring-emerald-600"
      : meeting.status === "upcoming"
      ? "ring-2 ring-amber-500"
      : meeting.status === "skipped"
      ? "ring-2 ring-rose-600"
      : "ring-2 ring-slate-900";

  return (
    <button
      onClick={() => onSelect(meeting.id)}
      className={[base, active ? activeRing : ""].join(" ")}
    >
      <div className="text-sm font-semibold text-slate-900 truncate">
        {meeting.title}
      </div>
      <div className="text-xs text-slate-500">{meeting.when}</div>
    </button>
  );
}
