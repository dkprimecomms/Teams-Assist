// src/components/main/TopBar.jsx
import React from "react";
import PrimeLogo from "../../assets/prime.png";

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 text-slate-500"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function TopBar({
  onOpenSidebar,
  statusTab,

  rangePreset,
  onChangeRangePreset,
  dateRange,
  onApplyCustomRange,
  onResetRange,
}) {
  const isCustom = rangePreset === "custom";

  const [from, setFrom] = React.useState(() => (dateRange?.startISO || "").slice(0, 10));
  const [to, setTo] = React.useState(() => (dateRange?.endISO || "").slice(0, 10));

  React.useEffect(() => {
    setFrom((dateRange?.startISO || "").slice(0, 10));
    setTo((dateRange?.endISO || "").slice(0, 10));
  }, [dateRange?.startISO, dateRange?.endISO]);

  const invalidRange = !!from && !!to && from > to;

  return (
    <header className="glass rounded-2xl border border-white/30 px-4 py-3 shadow-sm">
      <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* LEFT */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          {/* Mobile menu */}
          <button
            onClick={onOpenSidebar}
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-full glass shadow-md text-slate-700 self-start"
            title="Meetings"
          >
            <MenuIcon />
          </button>

          {/* Date range select */}
          <div className="relative min-w-[240px]">
            <label className="block text-[11px] text-slate-600 mb-1">
              Date range
            </label>

            <select
              value={rangePreset}
              onChange={(e) => onChangeRangePreset?.(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white/80 px-4 py-3 pr-12 text-sm"
            >
              <option value="currentWeek">Current week</option>

              {statusTab === "upcoming" ? (
                <>
                  <option value="nextWeek">Next week</option>
                  <option value="nextMonth">Next month</option>
                </>
              ) : (
                <>
                  <option value="previousWeek">Previous week</option>
                  <option value="previousMonth">Previous month</option>
                </>
              )}

              <option value="currentMonth">Current month</option>
              <option value="custom">Custom</option>
            </select>

            {/* Proper arrow */}
            <div className="pointer-events-none absolute right-4 top-[36px] flex items-center">
              <ChevronDown />
            </div>
          </div>

          {/* Custom range */}
          {isCustom && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white/80 px-2 py-1.5 text-sm"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white/80 px-2 py-1.5 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!from || !to || invalidRange) return;
                    onApplyCustomRange({
                      startISO: new Date(`${from}T00:00:00.000Z`).toISOString(),
                      endISO: new Date(`${to}T23:59:59.999Z`).toISOString(),
                    });
                  }}
                  disabled={!from || !to || invalidRange}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Apply
                </button>

                <button
                  type="button"
                  onClick={onResetRange}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-end">
          <img
            src={PrimeLogo}
            alt="Prime logo"
            className="h-8 w-auto object-contain select-none"
            draggable="false"
          />
        </div>
      </div>

      {isCustom && invalidRange && (
        <div className="mt-1 text-xs text-rose-600">
          “From” date must be earlier than “To” date.
        </div>
      )}
    </header>
  );
}
