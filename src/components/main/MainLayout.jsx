// src/components/main/MainLayout.jsx
import React from "react";
import TranscriptPanel from "./TranscriptPanel";
import RightRail from "./RightRail";

export default function MainLayout({ selected, meEmail, onOpenSidebar, onFetchSummary }) {
  return (
    <main className="h-full min-h-0 p-0 lg:p-5 flex flex-col overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(720px,1fr)_minmax(0,320px)] gap-4 flex-1 min-h-0 overflow-hidden items-stretch">
        <div className="min-h-0 flex flex-1 h-full">
          <TranscriptPanel
            selected={selected}
            meEmail={meEmail}
            onOpenSidebar={onOpenSidebar}
            onFetchSummary={onFetchSummary}
          />
        </div>

        <div className="min-h-0 hidden xl:flex flex-1 h-full">
          <RightRail selected={selected} />
        </div>
      </div>
    </main>
  );
}
