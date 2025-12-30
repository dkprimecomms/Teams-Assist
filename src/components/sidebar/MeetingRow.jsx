// src/components/sidebar/MeetingRow.jsx
import React from "react";

function activeBorderClass(status) {
  if (status === "completed") return "border-2 border-emerald-600";
  if (status === "upcoming") return "border-2 border-amber-500"; // scheduled
  if (status === "skipped") return "border-2 border-rose-600";
  return "border-2 border-slate-900";
}

export default function MeetingRow({ meeting, active, onSelect }) {
  const base =
    "w-full text-left rounded-xl px-3 py-2 bg-white hover:bg-slate-50 transition";

  // non-selected: light border
  const inactiveBorder = "border border-slate-200";

  // selected: thick colored border by status
  const selectedBorder = activeBorderClass(meeting.status);

  return (
    <button
      onClick={() => onSelect(meeting.id)}
      className={[base, active ? selectedBorder : inactiveBorder].join(" ")}
    >
      <div className="text-sm font-semibold text-slate-900 line-clamp-1">
        {meeting.title}
      </div>
      <div className="text-xs text-slate-500">{meeting.when}</div>
    </button>
  );
}
