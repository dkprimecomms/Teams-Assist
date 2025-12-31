import React from "react";

export default function ParticipantsIcon({ className = "h-5 w-5 text-slate-600" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* head 1 */}
      <path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4z" />
      {/* head 2 */}
      <path d="M8 11c1.66 0 3-1.79 3-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4z" />
      {/* body 1 */}
      <path d="M14 14c-1.2.55-2 1.6-2 2.8V20h9v-3.2c0-1.9-3.5-3.1-7-2.8z" />
      {/* body 2 */}
      <path d="M3 20v-3.2c0-1.9 3.5-3.1 7-2.8 1.2.55 2 1.6 2 2.8V20H3z" />
    </svg>
  );
}
