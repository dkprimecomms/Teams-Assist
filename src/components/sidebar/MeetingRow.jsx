import React from "react";

export default function MeetingRow({ meeting, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(meeting.id)}
      className={[
        "w-full text-left rounded-xl border border-slate-200 px-3 py-2",
        "bg-white hover:bg-slate-50 transition",
        active ? "ring-2 ring-slate-900" : "",
      ].join(" ")}
    >
      <div className="text-sm font-semibold text-slate-900">{meeting.title}</div>
      <div className="text-xs text-slate-500">{meeting.when}</div>
    </button>
  );
}
