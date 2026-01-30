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

export default function TopBar({
  onOpenSidebar,
  dateRange,
  onApplyDateRange,
  onResetDateRange,
}) {
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
        {/* LEFT: hamburger + date filter */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <button
            onClick={onOpenSidebar}
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-full glass shadow-md text-slate-700 self-start"
            title="Meetings"
          >
            <MenuIcon />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!from || !to || invalidRange) return;
                const startISO = new Date(`${from}T00:00:00.000Z`).toISOString();
                const endISO = new Date(`${to}T23:59:59.999Z`).toISOString();
                onApplyDateRange?.({ startISO, endISO });
              }}
              disabled={!from || !to || invalidRange}
              className={[
                "rounded-xl border px-3 py-1.5 text-sm font-medium transition",
                !from || !to || invalidRange
                  ? "border-slate-100 text-slate-300 bg-white/60 cursor-not-allowed"
                  : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              Apply
            </button>

            <button
              type="button"
              onClick={onResetDateRange}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* RIGHT: Prime logo (bundled asset, Teams-safe) */}
        <div className="flex items-center justify-end">
          <img
            src={PrimeLogo}
            alt="Prime logo"
            className="h-8 w-auto object-contain select-none"
            draggable="false"
          />
        </div>
      </div>

      {invalidRange && (
        <div className="mt-1 text-xs text-rose-600">
          “From” date must be earlier than “To” date.
        </div>
      )}
    </header>
  );
}
