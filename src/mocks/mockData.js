// src/mocks/mockData.js

export const mockMeetings = [
  {
    id: "m1",
    title: "Daily Standup",
    status: "upcoming",
    startUTC: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1h
    endUTC: new Date(Date.now() + 90 * 60 * 1000).toISOString(),  // +1.5h
    joinWebUrl: "https://teams.microsoft.com/l/meetup-join/FAKE1",
    onlineProvider: "teamsForBusiness",
    summary: "",
  },
  {
    id: "m2",
    title: "Project Sync",
    status: "completed",
    startUTC: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // -3h
    endUTC: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),   // -2h
    joinWebUrl: "https://teams.microsoft.com/l/meetup-join/FAKE2",
    onlineProvider: "teamsForBusiness",
    summary: "Summary placeholder: discussed milestones and blockers.",
  },
  {
    id: "m3",
    title: "Client Review",
    status: "skipped",
    startUTC: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // -1d
    endUTC: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(), // -23.5h
    joinWebUrl: "",
    onlineProvider: "",
    summary: "",
  },
];

export const mockParticipantsByMeetingId = {
  m1: [
    { name: "Dheepan Kanna", email: "dkanna@primecomms.com", role: "organizer", response: "accepted" },
    { name: "Asha N", email: "asha@primecomms.com", role: "required", response: "accepted" },
    { name: "Rahul S", email: "rahul@primecomms.com", role: "optional", response: "none" },
  ],
  m2: [
    { name: "Dheepan Kanna", email: "dkanna@primecomms.com", role: "required", response: "accepted" },
    { name: "Priya V", email: "priya@primecomms.com", role: "organizer", response: "accepted" },
    { name: "Karthik M", email: "karthik@primecomms.com", role: "required", response: "tentativelyAccepted" },
  ],
  m3: [
    { name: "Dheepan Kanna", email: "dkanna@primecomms.com", role: "organizer", response: "none" },
    { name: "Guest User", email: "guest@external.com", role: "required", response: "none" },
  ],
};

export const mockTranscriptByMeetingId = {
  m2: `WEBVTT

00:00:00.000 --> 00:00:06.000
Priya: Let's start. Today we’ll review the milestone progress.

00:00:06.000 --> 00:00:14.000
Dheepan: Backend SSO is working. Next is transcripts and UI polish.

00:00:14.000 --> 00:00:22.000
Karthik: Blocker: calendar permissions need admin consent.

00:00:22.000 --> 00:00:30.000
Priya: Action items: finalize permissions + add participant photos.
`,
};
