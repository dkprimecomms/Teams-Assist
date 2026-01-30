//src/components/sidebar/MeetingRow.jsx
import React from "react";

function hoverBg(status) {
  if (status === "completed") return "hover:bg-[#c5f0d6]";
  if (status === "upcoming") return "hover:bg-[#b3def2]";
  if (status === "skipped") return "hover:bg-rose-50";
  return "hover:bg-slate-50";
}

function activeText(status) {
  if (status === "completed") return "text-emerald-700";
  if (status === "upcoming") return "text-amber-700";
  if (status === "skipped") return "text-rose-700";
  return "text-slate-700";
}

export default function MeetingRow({ meeting, active, onSelect }) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(meeting.id)}
        className={[
          "w-full text-left px-3 py-2 rounded-lg transition",
          hoverBg(meeting.status),
          active ? "bg-slate-100" : "bg-transparent",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className={[
                "text-sm font-semibold truncate",
                active ? "text-slate-900" : "text-slate-800",
              ].join(" ")}
            >
              {meeting.title}
            </div>
            <div className="text-xs text-slate-500 truncate">{meeting.when}</div>
          </div>

          
        </div>
      </button>

      {/* ✅ 50% divider line */}
      <div className="py-2">
        <div className="h-px w-1/2 mx-auto bg-slate-200" />
      </div>
    </div>
  );
}