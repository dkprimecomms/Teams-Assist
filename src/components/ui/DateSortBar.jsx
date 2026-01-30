// src/components/ui/DateSortBar.jsx
import React from "react";

/**
 * Date range + sort order bar.
 * Controlled by parent, but keeps local input state.
 *
 * Props:
 * - startISO (string|null)
 * - endISO (string|null)
 * - sortOrder ("asc"|"desc")
 * - onApply({ startISO, endISO, sortOrder })
 * - onReset()
 */
export default function DateSortBar({
  startISO = null,
  endISO = null,
  sortOrder = "asc",
  onApply,
  onReset,
}) {
  const initialFrom = startISO ? startISO.slice(0, 10) : "";
  const initialTo = endISO ? endISO.slice(0, 10) : "";

  const [from, setFrom] = React.useState(initialFrom);
  const [to, setTo] = React.useState(initialTo);
  const [sort, setSort] = React.useState(sortOrder);

  React.useEffect(() => {
    setFrom(initialFrom);
    setTo(initialTo);
    setSort(sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startISO, endISO, sortOrder]);

  const invalid = !!from && !!to && from > to;

  function apply() {
    if (invalid) return;
    const s = from ? new Date(`${from}T00:00:00.000Z`).toISOString() : null;
    const e = to ? new Date(`${to}T23:59:59.999Z`).toISOString() : null;
    onApply?.({ startISO: s, endISO: e, sortOrder: sort });
  }

  return (
    <div className="w-full bg-white/80 rounded-xl border border-slate-200 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-500">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-500">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label className="text-[11px] text-slate-500">Sort</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white"
          >
            <option value="asc">Old → New</option>
            <option value="desc">New → Old</option>
          </select>
        </div>

        <button
          type="button"
          onClick={apply}
          disabled={invalid}
          className={[
            "rounded-lg border px-3 py-1 text-sm",
            invalid
              ? "border-slate-100 bg-slate-100 text-slate-300 cursor-not-allowed"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          ].join(" ")}
        >
          Apply
        </button>

        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      {invalid && (
        <div className="mt-1 text-xs text-rose-600">“From” must be earlier than “To”.</div>
      )}
    </div>
  );
}
