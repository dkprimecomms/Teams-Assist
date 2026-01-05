import React from "react";
import TopBar from "./TopBar";
import TranscriptPanel from "./TranscriptPanel";
import RightRail from "./RightRail";

export default function MainLayout({ selected, meEmail }) {
  return (
    <main className="h-full min-h-0 p-5 flex flex-col gap-4 overflow-hidden">
      <TopBar selected={selected} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 flex-1 min-h-0 overflow-hidden items-stretch">
        <div className="min-h-0 flex">
          <TranscriptPanel selected={selected} meEmail={meEmail} />
        </div>

        <div className="min-h-0 flex">
          <RightRail selected={selected} />
        </div>
      </div>
    </main>
  );
}
