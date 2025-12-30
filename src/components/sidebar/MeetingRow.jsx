// src/components/sidebar/MeetingRow.jsx
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
      <div className="text-sm font-semibold text-slate-900 line-clamp-1">{meeting.title}</div>
      <div className="text-xs text-slate-500">{meeting.when}</div>

      {meeting.status === "completed" && (
        <div className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          Completed
        </div>
      )}
      {meeting.status === "upcoming" && (
        <div className="mt-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
          Scheduled
        </div>
      )}
      {meeting.status === "skipped" && (
        <div className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
          Skipped
        </div>
      )}
    </button>
  );
}
