// src/components/main/TranscriptPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import ParticipantsIcon from "../icons/ParticipantsIcon";
import { useParticipantPhotos } from "../../hooks/useParticipantPhotos";
import { fetchSummaryForMeeting } from "../../api/summaryApi";

function SummarizeIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h16" />
      <path d="M16 10l4 2-4 2z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
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
 * Robust-ish VTT transcript parser:
 * Supports:
 * - "Speaker: text"
 * - <v Speaker>text</v>
 * - "Speaker" line followed by body lines
 */
function parseVttToMessages(vtt) {
  const raw = String(vtt || "");
  if (!raw.trim()) return [];

  const cleaned = raw.replace(/\r/g, "").replace(/^WEBVTT[^\n]*\n+/i, "");
  const lines = cleaned.split("\n");

  const messages = [];
  let i = 0;

  const isTimeRange = (s) => typeof s === "string" && s.includes("-->");
  const isMeta = (s) =>
    !s ||
    /^NOTE\b/i.test(s) ||
    /^STYLE\b/i.test(s) ||
    /^REGION\b/i.test(s) ||
    /^[0-9]+$/.test(s.trim());

  const stripTags = (s) => String(s || "").replace(/<[^>]*>/g, "").trim();

  const parseVoiceTag = (s) => {
    const m = String(s || "").match(/<v\s+([^>]+)>([\s\S]*)<\/v>/i);
    if (m) return { speaker: stripTags(m[1]), text: stripTags(m[2]) };

    const m2 = String(s || "").match(/<v\s+([^>]+)>([\s\S]*)/i);
    if (m2) return { speaker: stripTags(m2[1]), text: stripTags(m2[2]) };

    return null;
  };

  while (i < lines.length) {
    const line = (lines[i] || "").trim();

    if (isMeta(line)) {
      i += 1;
      continue;
    }

    if (isTimeRange(line)) {
      i += 1;

      const chunk = [];
      while (i < lines.length) {
        const t = (lines[i] || "").trim();
        if (!t) break;
        if (/^NOTE\b/i.test(t)) break;
        chunk.push(t);
        i += 1;
      }

      let parsedAny = false;

      for (const c of chunk) {
        const vt = parseVoiceTag(c);
        if (vt && vt.speaker) {
          messages.push({ speaker: vt.speaker, text: vt.text || "" });
          parsedAny = true;
          continue;
        }

        const m = c.match(/^([^:]{1,80}):\s*(.+)$/);
        if (m) {
          messages.push({ speaker: stripTags(m[1]), text: stripTags(m[2]) });
          parsedAny = true;
          continue;
        }
      }

      if (!parsedAny) {
        if (chunk.length >= 2) {
          const possibleSpeaker = stripTags(chunk[0]);
          const body = stripTags(chunk.slice(1).join("\n"));
          if (possibleSpeaker && body) messages.push({ speaker: possibleSpeaker, text: body });
          else if (body) messages.push({ speaker: "Unknown", text: body });
        } else if (chunk.length === 1) {
          const only = stripTags(chunk[0]);
          if (only) messages.push({ speaker: "Unknown", text: only });
        }
      }

      while (i < lines.length && !(lines[i] || "").trim()) i += 1;
      continue;
    }

    i += 1;
  }

  const merged = [];
  for (const msg of messages) {
    if (!msg.text) continue;
    const prev = merged[merged.length - 1];
    if (prev && prev.speaker === msg.speaker) prev.text = `${prev.text}\n${msg.text}`;
    else merged.push({ speaker: msg.speaker || "Unknown", text: msg.text });
  }

  return merged;
}

// ✅ Animated toggle (blue pill)
function SegmentedToggle({ value, onChange, disabledSummary }) {
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
        onClick={() => !disabledSummary && onChange("summary")}
        className={[
          "relative z-10 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors duration-200",
          !isTranscript ? "text-white" : "text-slate-600 hover:text-slate-900",
          disabledSummary ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
        title={disabledSummary ? "Load transcript first" : "Summary"}
      >
        Summary
      </button>
    </div>
  );
}

function ParticipantsGroup({ participants = [], photoUrlByEmail = {} }) {
  const items = participants.slice(0, 6);
  const extra = participants.length - items.length;
  if (!participants.length) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {items.map((p) => {
          const email = (p.email || "").toLowerCase();
          const photo = photoUrlByEmail[email];

          return (
            <div
              key={(p.email || p.name) + (p.role || "")}
              className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 overflow-hidden flex items-center justify-center"
              title={p.name || p.email}
            >
              {photo ? (
                <img src={photo} alt={p.name || p.email} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] font-semibold text-slate-700">
                  {initials(p.name || p.email)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {extra > 0 && <span className="text-xs text-slate-600">+{extra}</span>}
    </div>
  );
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, "");
}

/**
 * ✅ Upcoming/Skipped details:
 * - NO header inside (header is only in top bar)
 * - Subject, Duration, Recurrence added
 * - ✅ Long single-line URLs won't stretch the layout (break-all)
 */
function MeetingDetails({ selected }) {
  const raw = selected?.raw || {};
  const organizerName = raw?.organizer?.emailAddress?.name || selected?.organizer?.name || "";
  const organizerEmail = raw?.organizer?.emailAddress?.address || selected?.organizer?.email || "";
  const location =
    selected?.location || raw?.location?.displayName || raw?.locations?.[0]?.displayName || "";
  const description = selected?.bodyPreview || raw?.bodyPreview || "";

  const subject = selected?.subject || raw?.subject || selected?.title || "";

  const durationText = (() => {
    const s = selected?.startUTC ? new Date(selected.startUTC) : null;
    const e = selected?.endUTC ? new Date(selected.endUTC) : null;
    if (!s || !e || isNaN(s) || isNaN(e)) return "(unknown)";
    const mins = Math.max(0, Math.round((e - s) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  })();

  const recurrenceText = (() => {
    const r = selected?.recurrence || raw?.recurrence;
    if (!r) return "(none)";

    const type = r?.pattern?.type || "";
    const interval = r?.pattern?.interval || 1;
    const days = (r?.pattern?.daysOfWeek || []).join(", ");
    const rangeType = r?.range?.type || "";
    const endDate = r?.range?.endDate || "";

    let base = type ? `${type}` : "recurring";
    if (interval > 1) base += ` (every ${interval})`;
    if (days) base += ` • ${days}`;
    if (rangeType === "endDate" && endDate) base += ` • until ${endDate}`;
    return base;
  })();

  return (
    <div className="bg-white overflow-hidden">
      <div className="p-2">
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

        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2 border-b border-slate-100">
  <div className="text-xs font-semibold text-slate-500">Provider</div>
<div className="text-sm text-slate-900 min-w-0 break-all">
    {selected?.onlineProvider || raw?.onlineMeetingProvider || "(not online)"}
  </div>
</div>


        <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500">Location</div>
          <div className="text-sm text-slate-900 break-words">{location || "(none)"}</div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500">Subject</div>
          <div className="text-sm text-slate-900 break-all">{subject || "(none)"}</div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500">Duration</div>
          <div className="text-sm text-slate-900">{durationText}</div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500">Recurrence</div>
          <div className="text-sm text-slate-900 break-words">{recurrenceText}</div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-3 py-2">
          <div className="text-xs font-semibold text-slate-500">Description</div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap break-all">
            {description ? stripHtml(description).trim() : "(no description)"}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryView({ summaryLoading, summaryError, summaryValue }) {
  return (
    <div className="text-[13.5px]">
      {summaryLoading ? (
        <div className="text-slate-600">Summarizing…</div>
      ) : summaryError ? (
        <div className="text-rose-700">Summary failed: {summaryError}</div>
      ) : summaryValue ? (
        <div className="space-y-4">
          <div>
            <div className="text-[14px] font-semibold text-[#00A4EF] mt-1">Purpose</div>
            <div className="mt-1 whitespace-pre-wrap">{summaryValue.purpose}</div>
          </div>

          <div>
            <div className="text-[14px] font-semibold text-[#00A4EF] mt-2">Key takeaways</div>
            <ul className="mt-1 list-disc marker:text-[#00A4EF] pl-5 space-y-1">
              {(summaryValue.takeaways || []).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[14px] font-semibold text-[#00A4EF] mt-2">Detailed summary</div>
            <div className="mt-1 whitespace-pre-wrap">{summaryValue.detailedSummary}</div>
          </div>

          <div>
            <div className="text-[14px] font-semibold text-[#00A4EF] mt-2">Action items</div>
            {(summaryValue.actionItems || []).length ? (
              <ul className="mt-1 space-y-2">
                {summaryValue.actionItems.map((a, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 p-2">
                    <div className="font-medium">{a.task}</div>
                    <div className="text-xs text-slate-600">
                      Owner: {a.owner || "—"} • Due: {a.dueDate || "—"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-1 text-slate-600">No action items found.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-slate-600">Click summarize to generate a summary.</div>
      )}
    </div>
  );
}

export default function TranscriptPanel({
  selected,
  participants = [],
  myEmail = "",
  onOpenParticipants,
  onOpenSidebar,
}) {
  const [tab, setTab] = useState("transcript");

  // summary state
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryValue, setSummaryValue] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const photoUrlByEmail = useParticipantPhotos(participants, API_BASE_URL);

  useEffect(() => {
    setTab("transcript");
  }, [selected?.id]);

  useEffect(() => {
    setSummaryLoading(false);
    setSummaryError("");
    setSummaryValue(null);
  }, [selected?.id]);

  const isCompleted = selected?.status === "completed";
  const isUpcoming = selected?.status === "upcoming";
  const isSkipped = selected?.status === "skipped";
  const isUpcomingOrSkipped = isUpcoming || isSkipped;

  const transcriptText = selected?.transcript || "";
  const raw = selected?.raw || {};
  const joinUrl = selected?.joinWebUrl || raw?.onlineMeeting?.joinUrl || "";

  const canSummarize = useMemo(
    () =>
      isCompleted &&
      transcriptText.trim().length > 0 &&
      !transcriptText.startsWith("Loading") &&
      !transcriptText.startsWith("Transcript load failed"),
    [isCompleted, transcriptText]
  );

  const messages = useMemo(() => {
    if (!isCompleted) return [];
    if (!transcriptText || transcriptText.startsWith("Loading")) return [];
    if (transcriptText.startsWith("Transcript load failed")) return [];
    return parseVttToMessages(transcriptText);
  }, [isCompleted, transcriptText]);

  function findParticipantForSpeaker(speaker) {
    const s = String(speaker || "").toLowerCase().trim();
    if (!s) return null;

    const sNorm = s.replace(/\(.*?\)/g, "").trim();

    return (
      (participants || []).find((p) => {
        const name = String(p.name || "").toLowerCase().trim();
        const email = String(p.email || "").toLowerCase().trim();
        if (!name && !email) return false;

        return (
          (name && (name.includes(sNorm) || sNorm.includes(name))) ||
          (email && (email.includes(sNorm) || sNorm.includes(email.split("@")[0])))
        );
      }) || null
    );
  }

  function isMine(msg) {
    const me = String(myEmail || "").toLowerCase().trim();
    if (!me) return false;

    const p = findParticipantForSpeaker(msg.speaker);
    if (p?.email) return String(p.email).toLowerCase() === me;

    const local = me.split("@")[0];
    return local && String(msg.speaker || "").toLowerCase().includes(local);
  }

  function avatarForParticipant(p, fallbackLabel) {
    const email = (p?.email || "").toLowerCase();
    const photo = email ? photoUrlByEmail[email] : null;

    if (photo) {
      return (
        <img
          src={photo}
          alt={p?.name || p?.email || fallbackLabel}
          className="h-8 w-8 rounded-full object-cover border border-slate-200"
        />
      );
    }

    return (
      <div className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-700">
        {initials(p?.name || p?.email || fallbackLabel)}
      </div>
    );
  }

  async function runSummarize() {
    if (!canSummarize || !selected) return;

    if (summaryValue) {
      setTab("summary");
      return;
    }

    setSummaryLoading(true);
    setSummaryError("");

    try {
      const result = await fetchSummaryForMeeting(selected);
      setSummaryValue(result);
      setTab("summary");
    } catch (e) {
      setSummaryError(String(e?.message || e));
      setTab("summary");
    } finally {
      setSummaryLoading(false);
    }
  }

  // ✅ Join button (responsive width)
  const JoinButton = ({ disabled = false }) => {
    if (!joinUrl || disabled) {
      return (
        <button
          disabled
          className={[
            "shrink-0 inline-flex items-center justify-center",
            "h-8 text-xs rounded-lg",
            "w-[82px] md:w-auto",
            "px-2 md:px-4 md:h-9 md:text-sm md:rounded-xl",
            "font-semibold",
            "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed",
          ].join(" ")}
        >
          Join in Teams
        </button>
      );
    }

    return (
      <a
        href={joinUrl}
        target="_blank"
        rel="noreferrer"
        className={[
          "shrink-0 inline-flex items-center justify-center",
          "h-8 text-xs rounded-lg",
          "w-[82px] md:w-auto",
          "px-2 md:px-4 md:h-9 md:text-sm md:rounded-xl",
          "font-semibold",
          "text-white bg-[#6264A7] hover:bg-[#5557A0]",
          "focus:outline-none focus:ring-2 focus:ring-[#6264A7]/40",
          "active:translate-y-[1px]",
        ].join(" ")}
        title="Join in Teams"
      >
        Join in Teams
      </a>
    );
  };

  const headerTitle = (
    <div className="flex items-start justify-between gap-3 w-full">
      {/* LEFT */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700"
          title="Meetings"
        >
          <MenuIcon />
        </button>

        {!isUpcomingOrSkipped ? (
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 break-words">
              {selected?.title || "Select a meeting"}
            </div>
            <div className="text-xs text-slate-500 line-clamp-2">{selected?.when || ""}</div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-slate-900 truncate">
              {selected?.title || raw?.subject || "(no subject)"}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">{selected?.when || ""}</div>
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex flex-col items-end gap-2 lg:flex-row lg:items-center shrink-0">
        {/* Completed toggle */}
        {isCompleted && (
          <SegmentedToggle
            value={tab}
            onChange={(next) => {
              setTab(next);
              if (next === "summary" && !summaryValue && !summaryLoading) {
                runSummarize();
              }
            }}
            disabledSummary={!canSummarize}
          />
        )}

        {/* ✅ Upcoming/Skipped MOBILE:
            Row 1: Participants button + Join button
            Row 2: Participants grouped icons (pushed below)
        */}
       {isUpcomingOrSkipped && (
  <div className="lg:hidden flex flex-col items-end gap-2">
    <div className="flex items-center gap-2">
      

      <JoinButton />
    </div>

    <ParticipantsGroup participants={participants} photoUrlByEmail={photoUrlByEmail} />
    <button
        onClick={onOpenParticipants}
        className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700"
        title="Participants"
        type="button"
      >
        <ParticipantsIcon />
      </button>
  </div>
)}
{isUpcomingOrSkipped && (
  <div className="hidden lg:flex items-center gap-2 shrink-0">

    <JoinButton />
  </div>
)}



        {/* Completed MOBILE participants controls */}
        {!isUpcomingOrSkipped && (
          <div className="flex items-center gap-2 lg:hidden">
            <ParticipantsGroup participants={participants} photoUrlByEmail={photoUrlByEmail} />
            <button
              onClick={onOpenParticipants}
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700"
              title="Participants"
              type="button"
            >
              <ParticipantsIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="h-full w-full" bodyClassName="min-h-0" title={headerTitle}>
      {isUpcoming ? (
        <div className="h-full min-h-0 overflow-auto pr-1">
          <MeetingDetails selected={selected} />
        </div>
      ) : (
        <div className="relative h-full min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto p-3 bg-white">
            {!selected ? (
              <div className="text-sm text-slate-600">Select a meeting.</div>
            ) : !isCompleted ? (
              <div className="text-sm text-slate-600">No transcript for this meeting status.</div>
            ) : tab === "summary" ? (
              <SummaryView summaryLoading={summaryLoading} summaryError={summaryError} summaryValue={summaryValue} />
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
                      {!mine && <div className="shrink-0">{avatarForParticipant(p, msg.speaker)}</div>}

                      <div className={["max-w-[78%] sm:max-w-[70%]", mine ? "text-right" : "text-left"].join(" ")}>
                        <div
                          className={[
                            "rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm border",
                            mine
                              ? "bg-[#00A4EF] text-white border-[#00A4EF]"
                              : "bg-white text-slate-900 border-slate-200",
                          ].join(" ")}
                        >
                          {!mine && <div className="text-[11px] font-semibold text-slate-500 mb-1">{msg.speaker}</div>}
                          <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                        </div>
                      </div>

                      {mine && <div className="shrink-0">{avatarForParticipant(p, "Me")}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Floating summarize button only on transcript tab */}
          {isCompleted && tab === "transcript" && (
            <button
              onClick={runSummarize}
              disabled={!canSummarize || summaryLoading}
              title={
                !canSummarize
                  ? "Load a transcript first"
                  : summaryLoading
                  ? "Summarizing…"
                  : "Summarize (generate + switch)"
              }
              className={[
                "absolute bottom-3 right-3 rounded-full border shadow-sm",
                "h-11 w-11 flex items-center justify-center",
                "transition active:translate-y-[1px]",
                canSummarize && !summaryLoading
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
