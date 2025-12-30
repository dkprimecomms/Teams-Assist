// src/components/main/MainLayout.jsx
import React from "react";
import TopBar from "./TopBar";
import TranscriptPanel from "./TranscriptPanel";
import RightRail from "./RightRail";

export default function MainLayout({ selected }) {
  return (
<main className="h-full min-h-0 p-5 flex flex-col gap-4 overflow-hidden">
      <TopBar selected={selected} />

<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start flex-1 min-h-0 overflow-hidden">
        <div className="lg:col-span-2 min-h-0">
          <TranscriptPanel selected={selected} />
        </div>

        <div className="min-h-0">
          <RightRail selected={selected} />
        </div>
      </div>
    </main>
  );
}
