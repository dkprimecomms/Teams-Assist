// src/components/main/TranscriptPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import { useParticipantPhotos } from "../../hooks/useParticipantPhotos";
import ParticipantsIcon from "../icons/ParticipantsIcon";

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

function MenuIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
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

function decodeHtml(s) {
  return String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function stripTags(s) {
  return String(s || "").replace(/<\/?[^>]+>/g, "").trim();
}

// "00:01:23.201" -> "01:23"
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

function parseVttToMessages(vtt) {
  const raw = String(vtt || "");
  if (!raw.trim()) return [];

  const normalized = raw.replace(/\r\n/g, "\n");
  const cleaned = normalized.replace(/^WEBVTT[^\n]*\n+/i, "");
  const lines = cleaned.split("\n");

  const messages = [];
  let lastSpeaker = null;
  let currentCueTime = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.includes("-->")) {
      const parts = line.split("-->");
      const startRaw = (parts[0] || "").trim();
      const startMatch = startRaw.match(/^(\d{2}:\d{2}:\d{2})(?:\.\d+)?$/);
      currentCueTime = startMatch ? formatVttTimestamp(startMatch[1]) : "";
      continue;
    }

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

    const colonMatch = line.match(/^([^:]{1,80}):\s*(.+)$/);
    if (colonMatch) {
      const speaker = colonMatch[1].trim() || "Unknown";
      const msgText = colonMatch[2].trim();
      messages.push({ speaker, text: msgText, time: currentCueTime || "" });
      lastSpeaker = speaker;
      continue;
    }

    const plain = stripTags(decodeHtml(line));
    if (!plain) continue;

    const last = messages[messages.length - 1];
    if (last) last.text = `${last.text}\n${plain}`;
    else messages.push({ speaker: "Unknown", text: plain, time: currentCueTime || "" });
  }

  const merged = [];
  for (const m of messages) {
    const prev = merged[merged.length - 1];
    if (prev && prev.speaker === m.speaker) prev.text = `${prev.text}\n${m.text}`;
    else merged.push({ ...m });
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

function statusDotClass(response) {
  const r = (response || "").toLowerCase();
  if (r === "accepted") return "bg-emerald-500";
  if (r === "declined") return "bg-rose-500";
  if (r === "tentativelyaccepted") return "bg-amber-500";
  return "bg-slate-300";
}

// ✅ Smaller on mobile (md+ normal)
function SegmentedToggle({ value, onChange }) {
  const isTranscript = value === "transcript";

  return (
    <div className={["relative inline-flex rounded-xl border border-slate-200 bg-slate-50", "p-0.5 md:p-1"].join(" ")}>
      <span
        className={[
          "absolute top-0.5 bottom-0.5 rounded-lg bg-[#00A4EF] transition-transform duration-300 ease-out",
          "w-[calc(50%-2px)] md:w-[calc(50%-4px)]",
        ].join(" ")}
        style={{ transform: `translateX(${isTranscript ? "0%" : "100%"})` }}
      />
      <button
        type="button"
        onClick={() => onChange("transcript")}
        className={[
          "relative z-10 rounded-lg font-semibold transition-colors duration-200",
          "text-xs px-2 py-1 md:text-sm md:px-3 md:py-1.5",
          isTranscript ? "text-white" : "text-slate-600 hover:text-slate-900",
        ].join(" ")}
      >
        Transcript
      </button>
      <button
        type="button"
        onClick={() => onChange("summary")}
        className={[
          "relative z-10 rounded-lg font-semibold transition-colors duration-200",
          "text-xs px-2 py-1 md:text-sm md:px-3 md:py-1.5",
          !isTranscript ? "text-white" : "text-slate-600 hover:text-slate-900",
        ].join(" ")}
      >
        Summary
      </button>
    </div>
  );
}

export default function TranscriptPanel({ selected, meEmail, onOpenSidebar, onFetchSummary }) {
  const [tab, setTab] = useState("transcript");
  const [participantsOpen, setParticipantsOpen] = useState(false);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    setTab("transcript");
    setParticipantsOpen(false);
    setSummaryError("");
    setSummaryLoading(false);
  }, [selected?.id]);

  const isCompleted = selected?.status === "completed";
  const transcriptText = selected?.transcript || "";
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

  async function ensureSummary() {
    if (!selected || !isCompleted) return;
    if (!canSummarize) return;
    if (selected.summaryObj) return;

    setSummaryError("");
    setSummaryLoading(true);
    try {
      await onFetchSummary?.(selected);
    } catch (e) {
      setSummaryError(String(e?.message || e));
    } finally {
      setSummaryLoading(false);
    }
  }

  async function onSummarizeClick() {
    if (!canSummarize) return;
    setTab("summary");
    await ensureSummary();
  }

  const summaryObj = selected?.summaryObj || null;

  return (
    <Card
      className="h-full w-full"
      bodyClassName="min-h-0"
      title={
        selected ? (
          <div className="flex items-start justify-between gap-3 w-full">
            <div className="flex items-start gap-2 min-w-0">
              {/* ✅ Meetings drawer button */}
              <button
                type="button"
                onClick={onOpenSidebar}
                className="xl:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-700"
                title="Meetings"
              >
                <MenuIcon className="h-5 w-5" />
              </button>

              {/* ✅ Tablet grouped icon (Participants only). Mobile shows same button, that’s fine. */}
              <button
                type="button"
                onClick={() => setParticipantsOpen(true)}
                className="xl:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-700"
                title="Participants"
              >
                <ParticipantsIcon />
              </button>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {selected.title || "(no subject)"}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 truncate">{selected.when || ""}</div>
              </div>
            </div>

            {isCompleted ? (
              <SegmentedToggle
                value={tab}
                onChange={async (next) => {
                  setTab(next);
                  if (next === "summary") await ensureSummary();
                }}
              />
            ) : null}
          </div>
        ) : (
          <div className="w-full flex items-center justify-between">
            <span>Meeting Details</span>
          </div>
        )
      }
    >
      <div className="relative rounded-xl border border-slate-200 bg-white h-full min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto p-3 bg-slate-50">
          {!selected ? (
            <div className="text-sm text-slate-600">Select a meeting.</div>
          ) : !isCompleted ? (
            <div className="text-sm text-slate-600">No transcript for upcoming/skipped meetings.</div>
          ) : tab === "summary" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              {summaryLoading ? (
                <div className="text-sm text-slate-600">Generating summary…</div>
              ) : summaryError ? (
                <div className="text-sm text-rose-700">Summary failed: {summaryError}</div>
              ) : summaryObj ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Purpose</div>
                    <div className="text-sm text-slate-900 whitespace-pre-wrap">{summaryObj.purpose || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">Takeaways</div>
                    {summaryObj.takeaways?.length ? (
                      <ul className="list-disc pl-5 text-sm text-slate-900 space-y-1">
                        {summaryObj.takeaways.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-600">—</div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Detailed summary</div>
                    <div className="text-sm text-slate-900 whitespace-pre-wrap">
                      {summaryObj.detailedSummary || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">Action items</div>
                    {summaryObj.actionItems?.length ? (
                      <div className="space-y-2">
                        {summaryObj.actionItems.map((a, i) => (
                          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <div className="text-sm text-slate-900 font-medium">{a.task || "—"}</div>
                            <div className="text-xs text-slate-600 mt-1">
                              Owner: {a.owner ?? "—"} <span className="text-slate-300">•</span> Due: {a.dueDate ?? "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600">No follow-up tasks found.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600">No summary yet. Click Summary to generate.</div>
              )}
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
                          mine ? "bg-[#00A4EF] text-white border-[#00A4EF]" : "bg-white text-slate-900 border-slate-200",
                        ].join(" ")}
                      >
                        {!mine && <div className="text-[11px] font-semibold text-slate-500 mb-1">{msg.speaker}</div>}
                        <div className="whitespace-pre-wrap break-words">{msg.text}</div>

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

        {/* ✅ Participants bottom-sheet (tablet/mobile) */}
        <div className="xl:hidden">
          <div
            className={[
              "absolute inset-0 z-20 bg-black/30 transition-opacity",
              participantsOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            ].join(" ")}
            onClick={() => setParticipantsOpen(false)}
          />

          <div
            className={[
              "absolute left-0 right-0 bottom-0 z-30",
              "bg-white border-t border-slate-200",
              "rounded-t-2xl shadow-xl",
              "transition-transform duration-300 ease-out",
              participantsOpen ? "translate-y-0" : "translate-y-full",
            ].join(" ")}
            style={{ height: "45%" }}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Participants</div>
              <button
                type="button"
                onClick={() => setParticipantsOpen(false)}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="h-[calc(100%-49px)] overflow-auto p-3 bg-slate-50">
              {participants.length === 0 ? (
                <div className="text-sm text-slate-500">No participants returned for this meeting.</div>
              ) : (
                <ul className="space-y-2">
                  {participants.map((p) => {
                    const email = (p.email || "").toLowerCase();
                    const photo = photoUrlByEmail[email];

                    return (
                      <li
                        key={`${email}-${p.role}`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 flex items-center gap-3"
                      >
                        <div className="relative shrink-0">
                          {photo ? (
                            <img
                              src={photo}
                              alt={p.name || p.email}
                              className="h-10 w-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center font-semibold text-slate-700">
                              {initials(p.name || p.email)}
                            </div>
                          )}

                          <span
                            className={[
                              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                              statusDotClass(p.response),
                            ].join(" ")}
                            title={p.response || "no response"}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p.name || "(no name)"}</div>
                          <div className="text-xs text-slate-500 truncate">{p.email}</div>
                          <div className="text-xs text-slate-600 mt-1">
                            {p.role}
                            {p.response ? ` • ${p.response}` : ""}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
