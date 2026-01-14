// src/components/main/RightRail.jsx
import React from "react";
import Card from "../ui/Card";
import ParticipantsIcon from "../icons/ParticipantsIcon";
import { useParticipantPhotos } from "../../hooks/useParticipantPhotos";

function initials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function statusDotClass(response) {
  const r = (response || "").toLowerCase();
  if (r === "accepted") return "bg-emerald-500";
  if (r === "declined") return "bg-rose-500";
  if (r === "tentativelyaccepted") return "bg-amber-500";
  return "bg-slate-300";
}

// Optional: nicer label for role
function roleLabel(role) {
  const r = String(role || "").toLowerCase();
  if (r === "organizer") return "Organizer";
  if (r === "required") return "Required";
  if (r === "optional") return "Optional";
  return role || "Attendee";
}

export default function RightRail({ selected }) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const participants = selected?.participants || [];
  const photoUrlByEmail = useParticipantPhotos(participants, API_BASE_URL);

  const status = selected?.status || "";
  const showNewLayout = status === "upcoming" || status === "skipped";

  return (
    <div className="flex flex-col gap-4 min-h-0 w-full">
      <Card
        className="w-full"
        bodyClassName="min-h-0"
        title={
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-900">
              {showNewLayout ? "Project Roles" : "Participants"}
            </span>
            <span className="text-slate-500">
              <ParticipantsIcon />
            </span>
          </div>
        }
        subtitle={showNewLayout ? "" : "People invited to the selected meeting."}
      >
        {/* scroll inside card body */}
        <div className="min-h-0 h-full overflow-auto pr-1">
          {!selected ? (
            <div className="text-sm text-slate-500">Select a meeting to see participants.</div>
          ) : !participants.length ? (
            <div className="text-sm text-slate-500">No participants returned for this meeting.</div>
          ) : showNewLayout ? (
            // ✅ NEW UI (Upcoming + Skipped): ONE container only, NO nested participant boxes
            <div className="">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {participants.map((p) => {
                  const email = (p.email || "").toLowerCase();
                  const photo = photoUrlByEmail[email];

                  return (
                    <div key={`${email}-${p.role}`} className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {photo ? (
                          <img
                            src={photo}
                            alt={p.name || p.email}
                            className="h-12 w-12 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center font-semibold text-slate-700">
                            {initials(p.name || p.email)}
                          </div>
                        )}

                        {/* Response dot */}
                        <span
                          className={[
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                            statusDotClass(p.response),
                          ].join(" ")}
                          title={p.response || "no response"}
                        />
                      </div>

                      {/* Name + role */}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {p.name || "(no name)"}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{roleLabel(p.role)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // ✅ OLD UI (Completed): keep your original list cards
            <ul className="space-y-2">
              {participants.map((p) => {
                const email = (p.email || "").toLowerCase();
                const photo = photoUrlByEmail[email];

                return (
                  <li
                    key={`${email}-${p.role}`}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 flex items-center gap-3"
                  >
                    {/* Avatar */}
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

                      {/* Response dot */}
                      <span
                        className={[
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                          statusDotClass(p.response),
                        ].join(" ")}
                        title={p.response || "no response"}
                      />
                    </div>

                    {/* Text */}
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
      </Card>
    </div>
  );
}
