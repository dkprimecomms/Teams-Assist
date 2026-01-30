// src/components/main/TranscriptPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import ParticipantsIcon from "../icons/ParticipantsIcon";
import { useParticipantPhotos } from "../../hooks/useParticipantPhotos";
import { fetchSummaryForMeeting } from "../../api/summaryApi";
import SummaryPng from "../../assets/summary.png";


function SummarizeIcon({ className = "", spinning = false }) {
  return (
    <img
      src={SummaryPng}
      alt="Summary"
      className={[
        className,
        spinning ? "animate-spin" : "",
        "select-none",
      ].join(" ")}
      draggable="false"
    />
  );
}


function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
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

function SegmentedToggle({ value, onChange, disabledSummary }) {
  const isTranscript = value === "transcript";

  return (
    <div className="relative inline-flex rounded-full glass p-1 shadow-md">
      <span
        className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-[#00A4EF] transition-transform duration-300 ease-out"
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

function SummaryView({ summaryLoading, summaryError, summaryValue }) {
  return (
    <div className="text-[13.5px]">
      {summaryLoading ? (
        <div className="flex items-center gap-3 text-slate-600">
          <SummarizeIcon className="h-6 w-6" spinning />
          <div className="text-[13.5px]">Summarizing…</div>
        </div>
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

/**
 * MeetingDetails:
 * - Uses ONLY the existing meeting data (subject/organizer/participants/duration/recurrence/location/description)
 * - Shows them as “boxes” (cards)
 * - Uses a responsive grid so the UI looks clearly different and more professional
 */
function MeetingDetails({ selected, participantsCount }) {
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

  const cleanDescription = description ? stripHtml(description).trim() : "";

  function FieldBox({ title, children, className = "" }) {
    return (
      <div
        className={[
          "rounded-2xl border border-white/25 bg-white/14 shadow-sm",
          "backdrop-blur-md",
          "p-4",
          className,
        ].join(" ")}
      >
        <div className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
          {title}
        </div>
        <div className="mt-2 text-sm text-slate-800 leading-relaxed break-words">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldBox title="Subject" className="md:col-span-2">
            {subject || "(none)"}
          </FieldBox>

          <FieldBox title="Organizer">
            <div>
              <div className="font-semibold">{organizerName || "(unknown)"}</div>
              {organizerEmail ? (
                <div className="text-slate-600 text-sm mt-1">{organizerEmail}</div>
              ) : null}
            </div>
          </FieldBox>

          <FieldBox title="Participants">
            {typeof participantsCount === "number"
              ? participantsCount
              : selected?.participants?.length || 0}
          </FieldBox>

          <FieldBox title="Duration">{durationText}</FieldBox>

          <FieldBox title="Recurrence">{recurrenceText}</FieldBox>


          <FieldBox title="Description" className="md:col-span-2">
            {cleanDescription || "(no description)"}
          </FieldBox>
        </div>
      </div>
    </div>
  );
}

function NoTranscriptAnimation() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-4">
      <div className="relative">
        <div className="h-14 w-12 rounded-lg border-2 border-slate-300 bg-white flex items-center justify-center">
          <div className="space-y-1">
            <div className="h-1.5 w-6 bg-slate-300 rounded" />
            <div className="h-1.5 w-5 bg-slate-300 rounded" />
            <div className="h-1.5 w-4 bg-slate-300 rounded" />
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-0.5 bg-rose-400 rotate-45" />
        </div>

        <span className="absolute inset-0 rounded-lg animate-pulse bg-slate-200/30" />
      </div>

      <div className="text-sm font-medium text-slate-600">No transcript available</div>

      <div className="text-xs text-slate-400 max-w-[220px]">
        This meeting was completed without a transcript
      </div>
    </div>
  );
}

function TranscriptErrorAnimation({ message }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-rose-700 gap-3 p-4">
      <style>{`
        @keyframes _errShake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <div className="relative">
        <div
          className="h-16 w-12 rounded-lg border-2 border-rose-300 bg-white flex items-center justify-center"
          style={{ animation: " _errShake 900ms ease-in-out" }}
          aria-hidden
        >
          <div className="space-y-1">
            <div className="h-2 w-6 bg-rose-200 rounded" />
            <div className="h-2 w-5 bg-rose-200 rounded" />
            <div className="h-2 w-4 bg-rose-200 rounded" />
          </div>
        </div>

        <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-rose-600 text-white flex items-center justify-center font-semibold shadow-sm">
          ✕
        </div>

        <span className="absolute inset-0 rounded-lg bg-rose-600/10 pointer-events-none" />
      </div>

      <div className="text-sm font-semibold">Transcript failed to load</div>
      {message ? <div className="text-xs text-rose-500 max-w-[280px]">{message}</div> : null}
    </div>
  );
}

function TranscriptSearchingAnimation() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-4">
      <div className="relative">
        <div className="h-14 w-12 rounded-lg border-2 border-slate-300 bg-white flex items-center justify-center">
          <div className="space-y-1">
            <div className="h-1.5 w-6 bg-slate-300 rounded" />
            <div className="h-1.5 w-5 bg-slate-300 rounded" />
            <div className="h-1.5 w-4 bg-slate-300 rounded" />
          </div>
        </div>

        <span className="absolute inset-0 rounded-lg animate-ping bg-[#00A4EF]/20" />
      </div>

      <div className="text-sm font-medium">Checking for transcript</div>

      <div className="flex gap-1 text-[#00A4EF]">
        <span className="animate-bounce [animation-delay:0ms]">•</span>
        <span className="animate-bounce [animation-delay:150ms]">•</span>
        <span className="animate-bounce [animation-delay:300ms]">•</span>
      </div>
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
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryValue, setSummaryValue] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const photoUrlByEmail = useParticipantPhotos(participants, API_BASE_URL);

  useEffect(() => setTab("transcript"), [selected?.id]);
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

  // If we already have it, just show it
  if (summaryValue) {
    setTab("summary");
    return;
  }

  // ✅ Switch immediately so user sees progress while generating
  setTab("summary");
  setSummaryLoading(true);
  setSummaryError("");

  try {
    const result = await fetchSummaryForMeeting(selected);
    setSummaryValue(result);
  } catch (e) {
    setSummaryError(String(e?.message || e));
  } finally {
    setSummaryLoading(false);
  }
}



  const headerTitle = (
    <div className="w-full min-w-0">
      <div className="flex items-start justify-between gap-3 w-full min-w-0">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700 shrink-0"
            title="Meetings"
          >
            <MenuIcon />
          </button>

          {!isUpcomingOrSkipped ? (
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">
                {selected?.title || "Select a meeting"}
              </div>
              <div className="text-xs text-slate-500 line-clamp-2">{selected?.when || ""}</div>
            </div>
          ) : (
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900 truncate">
                {selected?.title || raw?.subject || "(no subject)"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">{selected?.when || ""}</div>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          {isCompleted && (
            <SegmentedToggle
              value={tab}
              onChange={(next) => {
                setTab(next);
                if (next === "summary" && !summaryValue && !summaryLoading) runSummarize();
              }}
              disabledSummary={!canSummarize}
            />
          )}

          <button
            onClick={onOpenParticipants}
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700"
            title="Participants"
            type="button"
          >
            <ParticipantsIcon />
          </button>

          {isUpcomingOrSkipped && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {joinUrl ? (
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={[
                      "inline-flex items-center justify-center shrink-0",
                      "h-8 text-xs rounded-lg w-[92px] sm:w-[104px] md:w-auto",
                      "px-2 sm:px-3 md:px-4 md:h-9 md:text-sm md:rounded-xl",
                      "font-semibold",
                      "text-white bg-[#6264A7]/90 hover:bg-[#4E5FBF]",
                      "rounded-full shadow-lg backdrop-blur-md",
                      "focus:outline-none focus:ring-2 focus:ring-[#6264A7]/40",
                      "active:translate-y-[1px]",
                    ].join(" ")}
                    title="Join in Teams"
                  >
                    Join
                  </a>
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center justify-center shrink-0 h-8 text-xs rounded-lg w-[92px] sm:w-[104px] md:w-auto px-2 md:px-4 md:h-9 md:text-sm md:rounded-xl font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  >
                    Join
                  </button>
                )}
              </div>

              <div className="md:hidden">
                <ParticipantsGroup participants={participants} photoUrlByEmail={photoUrlByEmail} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-full w-full min-w-0" bodyClassName="min-h-0 min-w-0" title={headerTitle}>
      {isUpcomingOrSkipped ? (
        // IMPORTANT: no outer overflow-auto (MeetingDetails handles scrolling)
        <div className="h-full min-h-0 min-w-0 overflow-hidden">
          <MeetingDetails selected={selected} participantsCount={participants.length} />
        </div>
      ) : (
        <div className="relative h-full min-h-0 min-w-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto p-3 min-w-0">
            {!selected ? (
              <div className="text-sm text-slate-600">Select a meeting.</div>
            ) : !isCompleted ? (
              <div className="text-sm text-slate-600">No transcript for this meeting status.</div>
            ) : tab === "summary" ? (
              <SummaryView
                summaryLoading={summaryLoading}
                summaryError={summaryError}
                summaryValue={summaryValue}
              />
            ) : transcriptText.startsWith("Loading") ? (
              <TranscriptSearchingAnimation />
            ) : transcriptText.startsWith("Transcript load failed") ? (
              <TranscriptErrorAnimation message={transcriptText} />
            ) : messages.length === 0 ? (
              <NoTranscriptAnimation />
            ) : (
              <div className="space-y-3 min-w-0">
                {messages.map((msg, idx) => {
                  const mine = isMine(msg);
                  const p = findParticipantForSpeaker(msg.speaker);

                  return (
                    <div
                      key={`${idx}-${msg.speaker}`}
                      className={["flex items-end gap-2 min-w-0", mine ? "justify-end" : "justify-start"].join(
                        " "
                      )}
                    >
                      {!mine && <div className="shrink-0">{avatarForParticipant(p, msg.speaker)}</div>}

                      <div
                        className={[
                          "max-w-[78%] sm:max-w-[70%] min-w-0",
                          mine ? "text-right" : "text-left",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm border min-w-0",
                            mine
                              ? "bg-[#00A4EF] text-white border-[#00A4EF]"
                              : "bg-white text-slate-900 border-slate-200",
                          ].join(" ")}
                        >
                          {!mine && (
                            <div className="text-[11px] font-semibold text-slate-500 mb-1">
                              {msg.speaker}
                            </div>
                          )}
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
              <SummarizeIcon className="h-5 w-5" spinning={summaryLoading} />
            </button>
          )}
        </div>
      )}
    </Card>
  );
}