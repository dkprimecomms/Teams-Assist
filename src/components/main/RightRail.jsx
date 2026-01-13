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

function InviteTile() {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
      title="Invite Member"
      onClick={() => {
        // optional: hook up later
      }}
    >
      <div className="h-10 w-10 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-700 text-lg leading-none">
        +
      </div>
      <div className="min-w-0 text-left">
        <div className="text-sm font-semibold text-slate-900 truncate">Invite Member</div>
        <div className="text-xs text-slate-500 truncate">Add attendee</div>
      </div>
    </button>
  );
}

function ParticipantTile({ p, photo }) {
  const email = (p.email || "").toLowerCase();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
      {/* Avatar */}
      <div className="relative shrink-0">
        {photo ? (
          <img
            src={photo}
            alt={p.name || p.email}
            className="h-10 w-10 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
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
        <div className="text-sm font-semibold text-slate-900 truncate">
          {p.name || email || "Unknown"}
        </div>
        <div className="text-xs text-slate-500 truncate">
          {p.role || "attendee"}
        </div>
      </div>
    </div>
  );
}

export default function RightRail({ selected }) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const participants = selected?.participants || [];
  const photoUrlByEmail = useParticipantPhotos(participants, API_BASE_URL);

  return (
    <div className="flex flex-col gap-4 min-h-0 w-full">
      <Card
        className="w-full"
        bodyClassName="min-h-0"
        title={
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-900">Project Roles</span>
            <span className="text-slate-500">
              <ParticipantsIcon />
            </span>
          </div>
        }
        subtitle="People invited to the selected meeting."
      >
        <div className="min-h-0 h-full overflow-auto pr-1">
          {!selected ? (
            <div className="text-sm text-slate-500">Select a meeting to see participants.</div>
          ) : participants.length === 0 ? (
            <div className="text-sm text-slate-500">No participants returned for this meeting.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Invite tile first */}
              <InviteTile />

              {/* Participants */}
              {participants.map((p, idx) => {
                const email = (p.email || "").toLowerCase();
                const photo = photoUrlByEmail[email];

                return (
                  <ParticipantTile
                    key={`${email || p.name || "p"}-${p.role || ""}-${idx}`}
                    p={p}
                    photo={photo}
                  />
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
