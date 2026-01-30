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

  // ✅ NEW: date range filter props
  dateRange,
  onApplyDateRange,
  onResetDateRange,

  // ✅ If you already added pagination buttons earlier, keep these props too:
  onPrevPage,
  onNextPage,
  canPrev,
  canNext,
}) {
  // Sliding underline (tabs)
  const activeIndex = Math.max(0, TABS.indexOf(statusTab));
  const translatePct = activeIndex * 100;

  // Local input state for date fields
  const [from, setFrom] = React.useState(() => (dateRange?.startISO || "").slice(0, 10));
  const [to, setTo] = React.useState(() => (dateRange?.endISO || "").slice(0, 10));

  // Keep inputs in sync if parent resets
  React.useEffect(() => {
    setFrom((dateRange?.startISO || "").slice(0, 10));
    setTo((dateRange?.endISO || "").slice(0, 10));
  }, [dateRange?.startISO, dateRange?.endISO]);

  const invalidRange = !!from && !!to && from > to;

  return (
    <aside className="h-full min-h-0 flex flex-col glass">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-semibold text-slate-900">Meetings</h1>
        <p className="text-xs text-slate-500">Filter and select a meeting</p>

        {/* ✅ Date range filter */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm"
            />
          </div>

          <div className="col-span-2 flex gap-2">
            <button
              onClick={() => {
                if (!from || !to || invalidRange) return;

                // Use UTC boundaries for the day range
                const startISO = new Date(`${from}T00:00:00.000Z`).toISOString();
                const endISO = new Date(`${to}T23:59:59.999Z`).toISOString();

                onApplyDateRange?.({ startISO, endISO });
              }}
              disabled={!from || !to || invalidRange}
              className={[
                "flex-1 rounded-lg border px-3 py-1.5 text-sm transition",
                !from || !to || invalidRange
                  ? "border-slate-100 text-slate-300 bg-white/60 cursor-not-allowed"
                  : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              Apply
            </button>

            <button
              onClick={onResetDateRange}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>

          {invalidRange && (
            <div className="col-span-2 text-xs text-rose-600">
              “From” date must be earlier than “To” date.
            </div>
          )}
        </div>
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

      {/* Meetings list */}
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

      {/* ✅ Pagination footer (keep if you already implemented paging) */}
      {typeof onPrevPage === "function" && typeof onNextPage === "function" && (
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
      )}
    </aside>
  );
}
