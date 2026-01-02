// src/components/main/MainLayout.jsx
import React from "react";
import TopBar from "./TopBar";
import TranscriptPanel from "./TranscriptPanel";
import RightRail from "./RightRail";

export default function MainLayout({
  selected,
  sidebarOpen,
  setSidebarOpen,
  participantsOpen,
  setParticipantsOpen,
}) {
  const participants = selected?.participants || [];

  return (
    <main className="h-full min-h-0 p-3 lg:p-5 flex flex-col gap-3 overflow-hidden">
      <TopBar selected={selected} onOpenSidebar={() => setSidebarOpen(true)} />

      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-[1fr_280px]
          gap-4
          flex-1
          min-h-0
          overflow-hidden
          items-stretch
        "
      >
        <div className="min-h-0 flex">
          <TranscriptPanel
            selected={selected}
            participants={participants}
            onOpenParticipants={() => setParticipantsOpen(true)}
          />
        </div>

        {/* Right rail only on lg+ */}
        <div className="min-h-0 hidden lg:flex">
          <RightRail selected={selected} />
        </div>
      </div>

      {/* Participants bottom-sheet on <lg (mobile + tablet) */}
      {participantsOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setParticipantsOpen(false)} />
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
            <div className="max-h-[60vh] overflow-auto p-3">
              <RightRail selected={selected} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
