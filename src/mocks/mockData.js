function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

// -----------------------------
// MEETINGS
// -----------------------------
export const mockMeetings = [
  // ===== COMPLETED =====
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: `completed-${i + 1}`,
    title: `Completed Meeting ${i + 1}`,
    status: "completed",
    startUTC: hoursAgo(5 + i),
    endUTC: hoursAgo(4.5 + i),
    joinWebUrl: `https://teams.microsoft.com/l/meetup-join/COMPLETED-${i + 1}`,
    onlineProvider: "teamsForBusiness",
    summary: `Summary for completed meeting ${i + 1}.`,

    // 👇 IMPORTANT:
    // completed-1 and completed-2 will have NO transcript
    noTranscript: i < 2,
  })),

  // ===== UPCOMING =====
  ...Array.from({ length: 5 }).map((_, i) => ({
    id: `upcoming-${i + 1}`,
    title: `Upcoming Meeting ${i + 1}`,
    status: "upcoming",
    startUTC: hoursFromNow(1 + i),
    endUTC: hoursFromNow(2 + i),
    joinWebUrl: `https://teams.microsoft.com/l/meetup-join/UPCOMING-${i + 1}`,
    onlineProvider: "teamsForBusiness",
    summary: "",
    recurrence: {
      pattern: { type: "weekly", interval: 1, daysOfWeek: ["monday"] },
      range: { type: "noEnd", startDate: "2026-01-01" },
    },
  })),

  // ===== SKIPPED =====
  ...Array.from({ length: 3 }).map((_, i) => ({
    id: `skipped-${i + 1}`,
    title: `Skipped Meeting ${i + 1}`,
    status: "skipped",
    startUTC: hoursAgo(48 + i),
    endUTC: hoursAgo(47.5 + i),
    joinWebUrl: "",
    onlineProvider: "",
    summary: "",
  })),
];

// -----------------------------
// PARTICIPANTS
// -----------------------------
export const mockParticipantsByMeetingId = Object.fromEntries(
  mockMeetings.map((m) => [
    m.id,
    [
      {
        name: "Dheepan Kanna",
        email: "dkanna@primecomms.com",
        role: "organizer",
        response: "accepted",
      },
      {
        name: "Asha N",
        email: "asha@primecomms.com",
        role: "required",
        response: "accepted",
      },
      {
        name: "Rahul S",
        email: "rahul@primecomms.com",
        role: "optional",
        response: "tentativelyAccepted",
      },
    ],
  ])
);

// -----------------------------
// TRANSCRIPTS (ONLY for completed that HAVE transcript)
// -----------------------------
export const mockTranscriptByMeetingId = Object.fromEntries(
  mockMeetings
    .filter((m) => m.status === "completed" && !m.noTranscript)
    .map((m) => [
      m.id,
      `WEBVTT

00:00:00.000 --> 00:00:05.000
Organizer: Welcome to ${m.title}.

00:00:05.000 --> 00:00:12.000
Dheepan: Progress update looks good.

00:00:12.000 --> 00:00:20.000
Asha: No blockers from my side.

00:00:20.000 --> 00:00:28.000
Rahul: Action items recorded.
`,
    ])
);
