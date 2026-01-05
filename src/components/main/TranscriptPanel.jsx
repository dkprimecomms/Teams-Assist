import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
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

function decodeHtml(s) {
  return String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function stripTags(s) {
  return String(s || "").replace(/<\/?[^>]+>/g, "").trim();
}

// ✅ "00:01:23.201" -> "01:23"
function formatVttTimestamp(hmsMs) {
  const s = String(hmsMs || "").trim();
  const m = s.match(/^(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/);
  if (!m) return "";
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3]);
  if (Number.isNaN(hh) || Number.isNaN(mm) || Number.isNaN(ss)) return "";
  const totalMinutes = hh * 60 + mm;
  const mm2 = String(totalMinutes).padStart(2, "0");
  const ss2 = String(ss).padStart(2, "0");
  return `${mm2}:${ss2}`;
}

/**
 * ✅ Teams VTT parser that:
 * - strips WEBVTT header
 * - reads timestamps
 * - extracts <v Speaker>Text</v>
 * - attaches a "time" to each message (from cue start time)
 * - merges consecutive same-speaker messages (keeps first time)
 */
function parseVttToMessages(vtt) {
  const raw = String(vtt || "");
  if (!raw.trim()) return [];

  // normalize newlines
  const normalized = raw.replace(/\r\n/g, "\n");

  // remove WEBVTT header line(s)
  const cleaned = normalized.replace(/^WEBVTT[^\n]*\n+/i, "");

  const lines = cleaned.split("\n");

  const messages = [];
  let lastSpeaker = null;
  let currentCueTime = ""; // formatted timestamp for current cue

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // cue time line: "00:00:03.281 --> 00:00:04.401"
    if (line.includes("-->")) {
      const parts = line.split("-->");
      const startRaw = (parts[0] || "").trim();
      // take only hh:mm:ss.xxx
      const startMatch = startRaw.match(/^(\d{2}:\d{2}:\d{2})(?:\.\d+)?$/);
      currentCueTime = startMatch ? formatVttTimestamp(startMatch[1]) : "";
      continue;
    }

    // <v Speaker>Text</v>
    const vMatch = line.match(/^<v\s*([^>]*)>([\s\S]*?)<\/v>$/i);
    if (vMatch) {
      const rawSpeaker = decodeHtml(vMatch[1] || "").trim();
      const rawText = decodeHtml(vMatch[2] || "").trim();

      const speaker = rawSpeaker || lastSpeaker || "Unknown";
      const msgText = stripTags(rawText);

      if (msgText) {
        messages.push({ speaker, text: msgText, time: currentCueTime || "" });
        lastSpeaker = speaker;
      }
      continue;
    }

    // fallback: "Name: text"
    const colonMatch = line.match(/^([^:]{1,80}):\s*(.+)$/);
    if (colonMatch) {
      const speaker = colonMatch[1].trim() || "Unknown";
      const msgText = colonMatch[2].trim();
      messages.push({ speaker, text: msgText, time: currentCueTime || "" });
      lastSpeaker = speaker;
      continue;
    }

    // fallback: plain text -> append to previous message
    const plain = stripTags(decodeHtml(line));
    if (!plain) continue;

    const last = messages[messages.length - 1];
    if (last) last.text = `${last.text}\n${plain}`;
    else messages.push({ speaker: "Unknown", text: plain, time: currentCueTime || "" });
  }

  // merge consecutive same-speaker (keep earliest time)
  const merged = [];
  for (const m of messages) {
    const prev = merged[merged.length - 1];
    if (prev && prev.speaker === m.speaker) {
      prev.text = `${prev.text}\n${m.text}`;
      // keep prev.time
    } else {
      merged.push({ ...m });
    }
  }

  return merged;
}

function findParticipantForSpeaker(speaker, participants) {
  const s = String(speaker || "").trim().toLowerCase();
  if (!s) return null;

  let p = (participants || []).find((x) => String(x.name || "").trim().toLowerCase() === s);
  if (p) return p;

  p = (participants || []).find((x) => String(x.name || "").toLowerCase().includes(s));
  if (p) return p;

  p = (participants || []).find((x) => s.includes(String(x.name || "").toLowerCase()));
  return p || null;
}

function isMineMessage(msg, participants, meEmail) {
  const me = String(meEmail || "").toLowerCase();
  if (!me) return false;

  const p = findParticipantForSpeaker(msg.speaker, participants);
  if (!p?.email) return false;

  return String(p.email).toLowerCase() === me;
}

// ✅ Animated blue pill toggle
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

export default function TranscriptPanel({ selected, meEmail }) {
  const [tab, setTab] = useState("transcript");

  useEffect(() => {
    setTab("transcript");
  }, [selected?.id]);

  const isCompleted = selected?.status === "completed";
  const transcriptText = selected?.transcript || "";
  const summaryText = selected?.summary || "No summary yet.";

  const participants = selected?.participants || [];

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const photoUrlByEmail = useParticipantPhotos(participants, API_BASE_URL);

  const canSummarize = useMemo(() => {
    return (
      isCompleted &&
      transcriptText &&
      !transcriptText.startsWith("Loading") &&
      !transcriptText.startsWith("Transcript load failed")
    );
  }, [isCompleted, transcriptText]);

  const messages = useMemo(() => {
    if (!isCompleted) return [];
    if (!transcriptText || transcriptText.startsWith("Loading") || transcriptText.startsWith("Transcript load failed"))
      return [];
    return parseVttToMessages(transcriptText);
  }, [isCompleted, transcriptText]);

  function avatarNode(participant, fallback) {
    const email = (participant?.email || "").toLowerCase();
    const photo = email ? photoUrlByEmail[email] : null;

    if (photo) {
      return (
        <img
          src={photo}
          alt={participant?.name || participant?.email || "avatar"}
          className="h-8 w-8 rounded-full object-cover border border-slate-200"
        />
      );
    }

    return (
      <div className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-700">
        {initials(participant?.name || participant?.email || fallback)}
      </div>
    );
  }

  function onSummarizeClick() {
    if (!canSummarize) return;
    setTab("summary");
  }

  return (
    <Card
      className="h-full w-full"
      bodyClassName="min-h-0"
      title={isCompleted ? <SegmentedToggle value={tab} onChange={setTab} /> : "Meeting Details"}
      subtitle={
        !selected
          ? "Select a meeting."
          : !isCompleted
          ? "No transcript for upcoming/skipped meetings."
          : tab === "transcript"
          ? "Chat-style transcript."
          : "AI summary of this meeting."
      }
    >
      <div className="relative rounded-xl border border-slate-200 bg-white h-full min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto p-3 bg-slate-50">
          {!selected ? (
            <div className="text-sm text-slate-600">Select a meeting.</div>
          ) : !isCompleted ? (
            <div className="text-sm text-slate-600">
              Upcoming meetings show meeting details (your Meeting Details view).
            </div>
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
                const mine = isMineMessage(msg, participants, meEmail);
                const p = findParticipantForSpeaker(msg.speaker, participants);

                return (
                  <div
                    key={`${idx}-${msg.speaker}`}
                    className={["flex items-end gap-2", mine ? "justify-end" : "justify-start"].join(" ")}
                  >
                    {!mine && <div className="shrink-0">{avatarNode(p, msg.speaker)}</div>}

                    <div className={["max-w-[78%] sm:max-w-[70%]", mine ? "text-right" : "text-left"].join(" ")}>
                      <div
                        className={[
                          "rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm border",
                          mine
                            ? "bg-[#00A4EF] text-white border-[#00A4EF]"
                            : "bg-white text-slate-900 border-slate-200",
                        ].join(" ")}
                      >
                        {!mine && (
                          <div className="text-[11px] font-semibold text-slate-500 mb-1">{msg.speaker}</div>
                        )}
                        <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                        {/* ✅ timestamp */}
                        {msg.time ? (
                          <div className={["mt-1 text-[11px]", mine ? "text-white/80" : "text-slate-400"].join(" ")}>
                            {msg.time}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {mine && <div className="shrink-0">{avatarNode(p, "Me")}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
    </Card>
  );
}
