// src/api/summaryApi.js
import { getTeamsToken } from "./authApi";
import { postJson } from "./http";

const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS).toLowerCase() === "true";

export async function fetchSummaryForMeeting(meeting) {
  // ✅ MOCK MODE: return local summary (no backend call)
  if (USE_MOCKS) {
    const text = meeting?.summary?.trim() || "No summary available in mock data.";

    // Return same JSON shape as backend
    return {
  purpose: `To discuss the development of a Teams-like application with additional features, focusing on transcript and summary functionalities.`,
  takeaways: [
    "The team is developing a Teams-like application with enhanced features",
    "Transcript and summary functionalities are key components of the application",
    "A bot will be added to automatically join meetings",
    "The UI needs refinement, including scrollable transcript box and summary placement",
    "The application aims to provide in-house solutions without relying on premium features",
  ],
  detailedSummary: "The team discussed the development of a Teams-like application that includes transcript and summary features. They explored ways to differentiate their product from Teams, such as adding a bot that automatically joins meetings and sending emails to attendees after calls. The UI was reviewed, with suggestions to make the transcript box scrollable and potentially relocate the summary section. The team also discussed the importance of developing in-house solutions to avoid relying on premium features that require monthly payments.",
  actionItems: [
    { task: "Develop a bot to automatically join meetings", owner: null, dueDate: null, },
    { task: "Refine UI design, including scrollable transcript box", owner: "Dheepan", dueDate: null, },
    { task: "Create UI color scheme ideas", owner: "Shruthi", dueDate: null, },
    { task: "Implement email sending feature after call ends", owner: "Dheepan", dueDate: null, },

  ],
};

  }

  // ✅ REAL MODE: call backend
  const token = await getTeamsToken();

  const transcriptVtt = meeting?.transcript || "";
  if (
    !transcriptVtt ||
    transcriptVtt.startsWith("Loading") ||
    transcriptVtt.startsWith("Transcript load failed")
  ) {
    throw new Error("Transcript not available yet.");
  }

  const { res, data } = await postJson("/summarize", {
    token,
    title: meeting?.title || "",
    transcriptVtt,
  });

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.detail || `Summarize failed (${res.status})`);
  }

  return data.summary; // JSON
}
