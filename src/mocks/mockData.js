// src/mocks/mockData.js

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
  // ===== 30 COMPLETED =====
  ...Array.from({ length: 30 }).map((_, i) => ({
    id: `completed-${i + 1}`,
    title: `Completed Meeting ${i + 1}`,
    status: "completed",
    startUTC: hoursAgo(5 + i),
    endUTC: hoursAgo(4.5 + i),
    joinWebUrl: `https://teams.microsoft.com/l/meetup-join/COMPLETED-${i + 1}`,
    onlineProvider: "teamsForBusiness",
    summary: `Summary for completed meeting ${i + 1}.`,
  })),

  // ===== 15 UPCOMING =====
  ...Array.from({ length: 15 }).map((_, i) => ({
    id: `upcoming-${i + 1}`,
    title: `Upcoming Meeting ${i + 1}`,
    status: "upcoming",
    startUTC: hoursFromNow(1 + i),
    endUTC: hoursFromNow(1.5 + i),
    joinWebUrl: `https://teams.microsoft.com/l/meetup-join/UPCOMING-${i + 1}`,
    onlineProvider: "teamsForBusiness",
    summary: "",
  })),

  // ===== 6 SKIPPED =====
  ...Array.from({ length: 6 }).map((_, i) => ({
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
        name: "Harismithra D",
        email: "harismithra@primecomms.com",
        role: "optional",
        response: "tentativelyAccepted",
      },
      {
        name: "Harismithra D",
        email: "harismithra@primecomms.com",
        role: "optional",
        response: "tentativelyAccepted",
      },
      {
        name: "Harismithra D",
        email: "harismithra@primecomms.com",
        role: "optional",
        response: "tentativelyAccepted",
      },
      {
        name: "Harismithra D",
        email: "harismithra@primecomms.com",
        role: "optional",
        response: "tentativelyAccepted",
      },
      {
        name: "Harismithra D",
        email: "harismithra@primecomms.com",
        role: "optional",
        response: "tentativelyAccepted",
      },
      {
        name: "Rahul S",
        email: "rahul@primecomms.com",
        role: "optional",
        response: "tentativelyAccepted",
      },
      {
        name: "Kanishk S R",
        email: "kanishka@primecomms.com",
        role: "optional",
        response: "notResponded",
      },
      {
        name: "Harismithra D",
        email: "harismithra@primecomms.com",
        role: "optional",
        response: "tentativelyAccepted",
      },
    ],
  ])
);

// -----------------------------
// TRANSCRIPTS (only for completed)
// -----------------------------
export const mockTranscriptByMeetingId = Object.fromEntries(
  mockMeetings
    .filter((m) => m.status === "completed")
    .map((m) => [
      m.id,
      `WEBVTT

00:00:03.615 --> 00:00:03.775
<v Dheepan Kanna>Really.</v>

00:00:05.175 --> 00:00:05.295
<v >OK.</v>

00:00:05.535 --> 00:00:05.935
<v Sankar Ganesh Paramasivam>OK.</v>

00:00:05.895 --> 00:00:07.055
<v Dheepan Kanna>So the short uh.</v>

00:00:09.215 --> 00:00:11.695
<v Dheepan Kanna>Scheduled meetings pilot looking.</v>

00:00:10.775 --> 00:00:16.255
<v Sankar Ganesh Paramasivam>See in Team Maestro, but in Team Maestro we no need to do that manually, right?</v>

00:00:14.815 --> 00:00:14.935
<v Dheepan Kanna>OK.</v>

00:00:16.535 --> 00:00:17.935
<v Dheepan Kanna>Yes, yes, Sir.</v>

00:00:18.935 --> 00:00:34.095
<v Dheepan Kanna>So we'll just see any work around is there for that or else we'll go with 5050 options. So for some cases the transcript is on, then our bot will not join the this one meeting.</v>

00:00:34.775 --> 00:00:53.855
<v Dheepan Kanna>Else for the quick calls and things, we can just turn on the transcribe and remaining all transcript will be so we can plan accordingly so we can reduce the cost to some extent. So previously we have just forecasted how much it's gonna cost while using the transcribe function.</v>

00:00:35.055 --> 00:00:35.615
<v Sankar Ganesh Paramasivam>Mhm.</v>

00:00:55.695 --> 00:00:56.015
<v Sankar Ganesh Paramasivam>OK.</v>

00:00:56.775 --> 00:01:14.095
<v Dheepan Kanna>When compared to team so that is nothing Sir. But if the usage is more, if the calculations are wrong, like we had a limit the usage limit, we just assumed a particular usage limits until 19120 minutes I think so.</v>

00:00:58.855 --> 00:00:58.975
<v Sankar Ganesh Paramasivam>OK.</v>

00:01:04.655 --> 00:01:04.815
<v Sankar Ganesh Paramasivam>Mm.</v>

00:01:14.815 --> 00:01:31.455
<v Dheepan Kanna>So if we decide on that, then it compared to Team Maestro, our transcript function's gonna cost less. But if we are using the default transcription also along with it, then we can still reduce a bit so that it'll be way more cheaper compared to Team Maestro.</v>

00:01:26.775 --> 00:01:27.295
<v Sankar Ganesh Paramasivam>Mhm.</v>

00:01:31.655 --> 00:01:38.015
<v Dheepan Kanna>So they will see a noticeable change in cost when compared to the team I've shown our product.</v>

00:01:39.815 --> 00:01:39.935
<v Sankar Ganesh Paramasivam>OK.</v>

00:01:41.055 --> 00:01:52.735
<v Dheepan Kanna>So, so initially I'll just do the work with the default transcripts feature within the teams itself. Then we'll just go to the Amazon transcribe function.</v>

00:01:54.775 --> 00:02:04.895
<v Dheepan Kanna>So once the team meeting is done, then we'll send the recording to the AWS transcript function. Then we'll just transcribe the things out, then we'll get to our friend.</v>

00:02:08.335 --> 00:02:09.055
<v Sankar Ganesh Paramasivam>OK.</v>

00:02:09.735 --> 00:02:13.455
<v Dheepan Kanna>Try to share my screen once so.</v>

00:02:11.655 --> 00:02:13.135
<v Sankar Ganesh Paramasivam>One second.</v>

00:02:15.215 --> 00:02:15.375
<v Sankar Ganesh Paramasivam>Mm.</v>

00:02:15.655 --> 00:02:35.215
<v Dheepan Kanna>So as soon as we have scheduled the meeting, I got the pop up here. So the meetings and things will be updated fast. But The thing is for the quick meetings it is taking time. So for the transcript functions for the scribe also I think it'll take around 2:00 to 10 minutes.</v>

00:02:35.615 --> 00:02:36.135
<v Dheepan Kanna>Probably.</v>

00:02:38.775 --> 00:02:50.535
<v Dheepan Kanna>Based on their performance, the Microsoft's server performance, we'll see the transcribe as soon as that's done. But if you are using the transcribe function, we'll get it immediately.</v>

00:02:53.975 --> 00:02:56.975
<v Dheepan Kanna>That's the difference now I have noticed.</v>

00:02:58.095 --> 00:03:01.135
<v Sankar Ganesh Paramasivam>OK, so.</v>

00:03:00.735 --> 00:03:06.415
<v Dheepan Kanna>So once this meeting is completed, then uh, it'll just shift from upcoming to completed one.</v>

00:03:06.495 --> 00:03:16.095
<v Sankar Ganesh Paramasivam>OK, we'll see. We'll see. Now I'll end the call. We'll see we are getting the transcript inside or not. And have you connected the LLM with this?</v>

00:03:08.015 --> 00:03:14.255
<v Dheepan Kanna>OK, Sir. OK, Sir.</v>

00:03:16.615 --> 00:03:34.135
<v Dheepan Kanna>No Sir, not it. So bringing the content out from the Microsoft was actually challenging. So I started with that part. So once we have the content with this then it is simple because we are using through multiple projects so that is that can be done easily.</v>

00:03:18.375 --> 00:03:18.415
<v Sankar Ganesh Paramasivam>Oh.</v>

00:03:24.935 --> 00:03:25.535
<v Sankar Ganesh Paramasivam>Mhm.</v>

00:03:29.295 --> 00:03:29.535
<v Sankar Ganesh Paramasivam>Yeah.</v>

00:03:35.095 --> 00:03:36.095
<v Sankar Ganesh Paramasivam>Walk a phone.</v>

00:03:36.735 --> 00:03:37.055
<v Dheepan Kanna>Sure.</v>

00:03:38.215 --> 00:03:40.255
<v Sankar Ganesh Paramasivam>OK, I'll end the call. We'll see.</v>

00:03:40.335 --> 00:03:42.415
<v Dheepan Kanna>Sure, yes, sure.</v> 

`,
    ])
);
