// src/components/main/MainLayout.jsx
import React from "react";
import TopBar from "./TopBar";
import TranscriptPanel from "./TranscriptPanel";
import RightRail from "./RightRail";

export default function MainLayout({ selected }) {
  return (
    <main className="p-5 flex flex-col gap-4 overflow-auto">
      <TopBar selected={selected} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2">
          <TranscriptPanel selected={selected} />
        </div>

        <RightRail selected={selected} />
      </div>
    </main>
  );
}
