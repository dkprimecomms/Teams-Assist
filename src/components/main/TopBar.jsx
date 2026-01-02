// src/components/main/TopBar.jsx
import React from "react";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export default function TopBar({ selected, onOpenSidebar }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSidebar}
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-700"
            title="Meetings"
          >
            <MenuIcon />
          </button>

          <h2 className="text-xl font-semibold text-slate-900 truncate">Transcript Viewer</h2>
        </div>

        <p className="text-sm text-slate-500 mt-1">
          {selected ? (
            <>
              Viewing: <span className="font-medium text-slate-700">{selected.title}</span>{" "}
              <span className="text-slate-400">•</span>{" "}
              <span className="truncate">{selected.when}</span>
            </>
          ) : (
            "Select a meeting."
          )}
        </p>

        {selected?.status && (
          <div className="mt-1 text-xs text-slate-500">
            Status: <span className="font-medium text-slate-700">{selected.status}</span>
            {selected.onlineProvider ? (
              <>
                {" "}
                <span className="text-slate-400">•</span> Provider:{" "}
                <span className="font-medium text-slate-700">{selected.onlineProvider}</span>
              </>
            ) : null}
          </div>
        )}
      </div>

      <a
        className="hidden md:inline text-sm font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4"
        href="https://learn.microsoft.com/microsoftteams/platform/"
        target="_blank"
        rel="noreferrer"
      >
        Teams platform docs
      </a>
    </header>
  );
}
