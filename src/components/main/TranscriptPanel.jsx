//src/components/main/TranscriptPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import ParticipantsIcon from "../icons/ParticipantsIcon";
import { useParticipantPhotos } from "../../hooks/useParticipantPhotos";

function SummarizeIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h16" />
      <path d="M16 10l4 2-4 2z" />
    </svg>
  );
}

function initials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

/**
 * Very simple VTT transcript parser.
 * Expected lines like:
 * 00:00:00.000 --> 00:00:05.000
 * Organizer: Hello
 *
 * We extract "Speaker: text"
 */
function parseVttToMessages(vtt) {
  const text = String(vtt || "");
  if (!text.trim()) return [];

  // remove WEBVTT header
  const cleaned = text.replace(/^WEBVTT.*\n+/i, "");

  const lines = cleaned.split("\n").map((l) => l.trim());
  const messages = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // time range line
    if (line.includes("-->")) {
      i += 1;

      // collect text lines until blank
      const chunk = [];
      while (i < lines.length && lines[i] !== "") {
        chunk.push(lines[i]);
        i += 1;
      }

      // chunk can include multiple speaker lines
      for (const raw of chunk) {
        // "Name: message"
        const m = raw.match(/^([^:]{1,60}):\s*(.+)$/);
        if (m) {
          messages.push({
            speaker: m[1].trim(),
            text: m[2].trim(),
          });
        } else if (raw) {
          // if no speaker label, append to previous message if possible
          const last = messages[messages.length - 1];
          if (last) last.text = `${last.text}\n${raw}`;
          else messages.push({ speaker: "Unknown", text: raw });
        }
      }
    } else {
      i += 1;
    }
  }

  // merge consecutive messages from same speaker (chat-style)
  const merged = [];
  for (const msg of messages) {
    const prev = merged[merged.length - 1];
    if (prev && prev.speaker === msg.speaker) {
      prev.text = `${prev.text}\n${msg.text}`;
    } else {
      merged.push({ ...msg });
    }
  }

  return merged;
}

// ✅ Animated toggle (blue pill)
function SegmentedToggle({ value, onChange }) {
  const isTranscript = value === "transcript";

  return (
    <div className="relative inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
      <span
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-[#00A4EF] transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${isTranscript ? "0%" : "100%"})` }}
      />
      <button
        type="button"
        onClick={() => onChange("transcript")}
        className={[
          "relative z-10 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors duration-200",
          isTranscript ? "text-white" : "text-slate-600 hover:text-slate-900",
        ].join(" ")}
      >
        Transcript
      </button>
      <button
        type="button"
        onClick={() => onChange("summary")}
        className={[
          "relative z-10 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors duration-200",
          !isTranscript ? "text-white" : "text-slate-600 hover:text-slate-900",
        ].join(" ")}
      >
        Summary
      </button>
    </div>
  );
}

function ParticipantsGroup({ participants = [] }) {
  const items = participants.slice(0, 6);
  const extra = participants.length - items.length;
  if (!participants.length) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {items.map((p) => (
          <div
            key={(p.email || p.name) + (p.role || "")}
            className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-700"
            title={p.name || p.email}
          >
            {initials(p.name || p.email)}
          </div>
        ))}
      </div>
      {extra > 0 && <span className="text-xs text-slate-600">+{extra}</span>}
    </div>
  );
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, "");
}

function MeetingDetails({ selected }) {
  const raw = selected?.raw || {};
  const organizerName = raw?.organizer?.emailAddress?.name || selected?.organizer?.name || "";
  const organizerEmail = raw?.organizer?.emailAddress?.address || selected?.organizer?.email || "";
  const joinUrl = selected?.joinWebUrl || raw?.onlineMeeting?.joinUrl || "";
  const location =
    selected?.location || raw?.location?.displayName || raw?.locations?.[0]?.displayName || "";
  const description = selected?.bodyPreview || raw?.bodyPreview || "";

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-900 truncate">
            {selected?.title || raw?.subject || "(no subject)"}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 truncate">{selected?.when || ""}</div>
        </div>

        {joinUrl ? (
          <a
            href={joinUrl}
            target="_blank"
            rel="noreferrer"
            className={[
              "shrink-0 inline-flex items-center justify-center",
              "h-9 px-4 rounded-xl text-sm font-semibold",
              "text-white bg-[#6264A7] hover:bg-[#5557A0]",
              "focus:outline-none focus:ring-2 focus:ring-[#6264A7]/40",
              "active:translate-y-[1px]",
            ].join(" ")}
            title="Join in Teams"
          >
            Join in Teams
          </a>
        ) : (
          <button
            disabled
            className="shrink-0 h-9 px-4 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
          >
            Join in Teams
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500">Organizer</div>
          <div className="text-sm text-slate-900 break-words">
            {organizerName || "(unknown)"}{" "}
            {organizerEmail ? <span className="text-slate-500">• {organizerEmail}</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500">Status</div>
          <div>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
              {selected?.status || "upcoming"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500">Provider</div>
          <div className="text-sm text-slate-900 break-words">
            {selected?.onlineProvider || raw?.onlineMeetingProvider || "(not online)"}
          </div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500">Location</div>
          <div className="text-sm text-slate-900 break-words">{location || "(none)"}</div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-3 py-2">
          <div className="text-xs font-semibold text-slate-500">Description</div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap break-words">
            {description ? stripHtml(description).trim() : "(no description)"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TranscriptPanel({ selected, participants = [], onOpenParticipants }) {
  const [tab, setTab] = useState("transcript");

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const photoUrlByEmail = useParticipantPhotos(participants, API_BASE_URL);

  useEffect(() => {
    setTab("transcript");
  }, [selected?.id]);

  const isCompleted = selected?.status === "completed";
  const isUpcoming = selected?.status === "upcoming";

  const transcriptText = selected?.transcript || "";
  const summaryText = selected?.summary || "No summary yet.";

  const canSummarize = useMemo(
    () => isCompleted && transcriptText.trim().length > 0,
    [isCompleted, transcriptText]
  );

  // Who is "me"? (best-effort)
  const myEmail = useMemo(() => {
    const org = selected?.organizer?.email;
    if (org) return String(org).toLowerCase();
    const organizer = (participants || []).find((p) => String(p.role).toLowerCase() === "organizer");
    if (organizer?.email) return String(organizer.email).toLowerCase();
    return ""; // fallback later
  }, [selected, participants]);

  const messages = useMemo(() => {
    if (!isCompleted) return [];
    if (!transcriptText || transcriptText.startsWith("Loading")) return [];
    if (transcriptText.startsWith("Transcript load failed")) return [];
    return parseVttToMessages(transcriptText);
  }, [isCompleted, transcriptText]);

  // map speaker -> participant object (best-effort)
  function findParticipantForSpeaker(speaker) {
    const s = String(speaker || "").toLowerCase();

    // match by name contains
    const byName = (participants || []).find((p) => (p.name || "").toLowerCase().includes(s));
    if (byName) return byName;

    // match exact organizer label "Organizer"
    if (s === "organizer") {
      const org = (participants || []).find((p) => String(p.role).toLowerCase() === "organizer");
      if (org) return org;
    }

    return null;
  }

  function isMine(msg) {
    // If we know my email, compare against matched participant email
    const p = findParticipantForSpeaker(msg.speaker);
    if (myEmail && p?.email) return String(p.email).toLowerCase() === myEmail;

    // fallback: if speaker literally contains your name/email fragment
    if (myEmail && msg.speaker && String(msg.speaker).toLowerCase().includes(myEmail.split("@")[0])) return true;

    // last resort: treat "Dheepan" as mine if it exists in participants organizer (from mocks)
    const org = (participants || []).find((x) => String(x.role).toLowerCase() === "organizer");
    if (org?.name && msg.speaker) {
      const a = org.name.toLowerCase().split(/\s+/)[0];
      if (a && msg.speaker.toLowerCase().includes(a)) return true;
    }

    return false;
  }

  function avatarForParticipant(p, fallbackLabel) {
    const email = (p?.email || "").toLowerCase();
    const photo = email ? photoUrlByEmail[email] : null;

    if (photo) {
      return <img src={photo} alt={p?.name || p?.email} className="h-8 w-8 rounded-full object-cover border border-slate-200" />;
    }

    return (
      <div className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-700">
        {initials(p?.name || p?.email || fallbackLabel)}
      </div>
    );
  }

  function onSummarizeClick() {
    if (!canSummarize) return;
    setTab("summary"); // ✅ auto toggle
  }

  const headerTitle = (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 truncate">
            {selected?.title || "Select a meeting"}
          </div>
          <div className="text-xs text-slate-500 line-clamp-2">
            {selected?.when || ""}
          </div>
        </div>
      </div>

       <div className="flex flex-col items-end gap-2 lg:flex-row lg:items-center">
      {isCompleted && (<SegmentedToggle value={tab} onChange={setTab} />)}
      
      {/* Only below lg */}
      <div className="flex items-center gap-2 lg:hidden">
       
        <ParticipantsGroup participants={participants} />
        <button
          onClick={onOpenParticipants}
          className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700"
          title="Participants"
          type="button"
        >
          <ParticipantsIcon />
        </button>
      </div>
      </div>
    </div>
  );

  return (
    <Card
      className="h-full w-full"
      bodyClassName="min-h-0"
      title={headerTitle}
    
    >
      {/* Upcoming = Meeting Details */}
      {isUpcoming ? (
        <div className="h-full min-h-0 overflow-auto pr-1">
          <MeetingDetails selected={selected} />
        </div>
      ) : (
        <div className="relative rounded-xl border border-slate-200 bg-white h-full min-h-0 overflow-hidden flex flex-col">
          {/* Content */}
          <div className="flex-1 min-h-0 overflow-auto p-3 bg-slate-50">
            {!selected ? (
              <div className="text-sm text-slate-600">Select a meeting.</div>
            ) : !isCompleted ? (
              <div className="text-sm text-slate-600">No transcript for this meeting status.</div>
            ) : tab === "summary" ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 whitespace-pre-wrap break-words">
                {summaryText}
              </div>
            ) : transcriptText.startsWith("Loading") ? (
              <div className="text-sm text-slate-600">{transcriptText}</div>
            ) : transcriptText.startsWith("Transcript load failed") ? (
              <div className="text-sm text-rose-700">{transcriptText}</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-slate-600">No transcript loaded.</div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, idx) => {
                  const mine = isMine(msg);
                  const p = findParticipantForSpeaker(msg.speaker);

                  return (
                    <div
                      key={`${idx}-${msg.speaker}`}
                      className={["flex items-end gap-2", mine ? "justify-end" : "justify-start"].join(" ")}
                    >
                      {/* Left avatar */}
                      {!mine && (
                        <div className="shrink-0">
                          {avatarForParticipant(p, msg.speaker)}
                        </div>
                      )}

                      {/* Bubble */}
                      <div className={["max-w-[78%] sm:max-w-[70%]", mine ? "text-right" : "text-left"].join(" ")}>
                        <div
                          className={[
                            "rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm border",
                            mine
                              ? "bg-[#00A4EF] text-white border-[#00A4EF]"
                              : "bg-white text-slate-900 border-slate-200",
                          ].join(" ")}
                        >
                          {/* Speaker label for others */}
                          {!mine && (
                            <div className="text-[11px] font-semibold text-slate-500 mb-1">
                              {msg.speaker}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                        </div>
                      </div>

                      {/* Right avatar */}
                      {mine && (
                        <div className="shrink-0">
                          {avatarForParticipant(p, "Me")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summarize floating button only on transcript tab */}
          {isCompleted && tab === "transcript" && (
            <button
              onClick={onSummarizeClick}
              disabled={!canSummarize}
              title={canSummarize ? "Summarize (switch to Summary)" : "Load a transcript first"}
              className={[
                "absolute bottom-3 right-3 rounded-full border shadow-sm",
                "h-11 w-11 flex items-center justify-center",
                "transition active:translate-y-[1px]",
                canSummarize
                  ? "bg-white border-slate-300 text-slate-900 hover:bg-slate-100"
                  : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed",
              ].join(" ")}
              type="button"
            >
              <SummarizeIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
