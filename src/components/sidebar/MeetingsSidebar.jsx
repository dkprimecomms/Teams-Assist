// src/components/sidebar/MeetingsSidebar.jsx
import React, { useMemo } from "react";
import TabButton from "./TabButton";
import MeetingRow from "./MeetingRow";

export default function MeetingsSidebar({
  statusTab,
  setStatusTab,
  meetings,
  selectedMeetingId,
  setSelectedMeetingId,
}) {
  const filteredMeetings = useMemo(
    () => meetings.filter((m) => m.status === statusTab),
    [meetings, statusTab]
  );

  return (
    <aside className="border-r border-slate-200 bg-white p-4 flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Meetings</h1>
        <p className="text-xs text-slate-500">Filter and select a meeting</p>
      </div>

      <div className="flex gap-2">
        <TabButton active={statusTab === "completed"} onClick={() => setStatusTab("completed")}>
          Completed
        </TabButton>
        <TabButton active={statusTab === "upcoming"} onClick={() => setStatusTab("upcoming")}>
          Upcoming
        </TabButton>
        <TabButton active={statusTab === "skipped"} onClick={() => setStatusTab("skipped")}>
          Skipped
        </TabButton>
      </div>

      <div className="flex-1 overflow-auto pr-1">
        <div className="space-y-2">
          {filteredMeetings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              No meetings in this tab.
            </div>
          ) : (
            filteredMeetings.map((m) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                active={m.id === selectedMeetingId}
                onSelect={setSelectedMeetingId}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
