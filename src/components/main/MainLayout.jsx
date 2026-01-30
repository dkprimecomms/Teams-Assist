// src/components/main/MainLayout.jsx
import React from "react";
import TranscriptPanel from "./TranscriptPanel";
import RightRail from "./RightRail";
import DateSortBar from "../ui/DateSortBar";

export default function MainLayout({
  selected,
  sidebarOpen,
  setSidebarOpen,
  participantsOpen,
  setParticipantsOpen,
  myEmail,

  // ✅ global filters from App
  dateRange,
  sortOrder,
  onApplyFilters,
  onResetFilters,
}) {
  const participants = selected?.participants || [];

  return (
    <main className="h-full min-h-0 p-3 lg:p-4 flex flex-col gap-3 overflow-hidden">
      <div
        className={[
          "grid grid-cols-1 gap-4 flex-1 min-h-0 overflow-hidden items-stretch",
          selected?.status === "upcoming" || selected?.status === "skipped"
            ? "lg:grid-cols-[3fr_2fr]"
            : "lg:grid-cols-[1fr_280px]",
        ].join(" ")}
      >
        {/* LEFT: FILTER BAR + Transcript */}
        <div className="min-h-0 flex flex-col gap-3">
          {/* ✅ filter bar ABOVE transcript panel (always visible) */}
          <DateSortBar
            startISO={dateRange?.startISO || null}
            endISO={dateRange?.endISO || null}
            sortOrder={sortOrder || "asc"}
            onApply={onApplyFilters}
            onReset={onResetFilters}
          />

          <div className="min-h-0 flex">
            <TranscriptPanel
              selected={selected}
              participants={participants}
              myEmail={myEmail}
              onOpenParticipants={() => setParticipantsOpen(true)}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
          </div>
        </div>

        {/* RIGHT: FILTER BAR + Participants (desktop only) */}
        <div className="min-h-0 hidden lg:flex flex-col gap-3">
         

          <RightRail selected={selected} />
        </div>
      </div>

      {/* Participants sheet on mobile */}
      {participantsOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setParticipantsOpen(false)}
          />
          <div className="fixed z-50 left-0 right-0 bottom-0 lg:hidden bg-white rounded-t-2xl border-t border-slate-200 shadow-lg">
            <div className="p-3 flex items-center justify-between">
              <div className="font-semibold text-slate-900">Participants</div>
              <button
                onClick={() => setParticipantsOpen(false)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-sm text-slate-700"
              >
                Close
              </button>
            </div>

            {/* ✅ filter bar ABOVE participants list in the sheet */}
            <div className="px-3 pb-3">
              <DateSortBar
                startISO={dateRange?.startISO || null}
                endISO={dateRange?.endISO || null}
                sortOrder={sortOrder || "asc"}
                onApply={onApplyFilters}
                onReset={onResetFilters}
              />
            </div>

            <div className="max-h-[60vh] overflow-auto p-3">
              <RightRail selected={selected} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
