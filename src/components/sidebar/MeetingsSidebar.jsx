// src/components/sidebar/MeetingsSidebar.jsx
import React from "react";
import TabButton from "./TabButton";
import MeetingRow from "./MeetingRow";

const TABS = ["completed", "upcoming", "skipped"];

function tabLabel(key) {
  if (key === "completed") return "Completed";
  if (key === "upcoming") return "Upcoming";
  return "Skipped";
}

export default function MeetingsSidebar({
  statusTab,
  setStatusTab,
  meetings,
  selectedMeetingId,
  setSelectedMeetingId,

  // ✅ NEW pagination props
  onPrevPage,
  onNextPage,
  canPrev,
  canNext,
}) {
  // Sliding underline for tabs
  const activeIndex = Math.max(0, TABS.indexOf(statusTab));
  const translatePct = activeIndex * 100;

  return (
    <aside className="h-full min-h-0 flex flex-col glass">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-semibold text-slate-900">Meetings</h1>
        <p className="text-xs text-slate-500">Filter and select a meeting</p>
      </div>

      {/* Tabs with sliding underline */}
      <div className="border-b border-slate-200 px-4">
        <div className="relative">
          <div className="grid grid-cols-3">
            {TABS.map((k) => (
              <TabButton key={k} active={statusTab === k} onClick={() => setStatusTab(k)}>
                {tabLabel(k)}
              </TabButton>
            ))}
          </div>

          <div className="relative h-[2px]">
            <div
              className="absolute left-0 bottom-0 h-[2px] w-1/3 rounded-full bg-[#00A4EF] transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${translatePct}%)` }}
            />
          </div>
        </div>
      </div>

      {/* Meetings list (current page only) */}
      <div className="flex-1 overflow-auto px-2 py-2">
        {meetings.length === 0 ? (
          <div className="px-3 py-3 text-sm text-slate-600">No meetings in this tab.</div>
        ) : (
          <div>
            {meetings.map((m) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                active={m.id === selectedMeetingId}
                onSelect={setSelectedMeetingId}
              />
            ))}
          </div>
        )}
      </div>

      {/* ✅ Pagination footer */}
      <div className="border-t border-slate-200 px-3 py-2 flex items-center justify-between">
        <button
          onClick={onPrevPage}
          disabled={!canPrev}
          className={[
            "px-3 py-1.5 rounded-lg border text-sm transition",
            canPrev
              ? "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
              : "border-slate-100 text-slate-300 bg-white/60 cursor-not-allowed",
          ].join(" ")}
        >
          Prev
        </button>

        <button
          onClick={onNextPage}
          disabled={!canNext}
          className={[
            "px-3 py-1.5 rounded-lg border text-sm transition",
            canNext
              ? "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
              : "border-slate-100 text-slate-300 bg-white/60 cursor-not-allowed",
          ].join(" ")}
        >
          Next
        </button>
      </div>
    </aside>
  );
}
