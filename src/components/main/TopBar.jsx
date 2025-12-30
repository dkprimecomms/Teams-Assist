// src/components/main/TopBar.jsx
import React from "react";

export default function TopBar({ selected }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Transcript Viewer</h2>
        <p className="text-sm text-slate-500">
          {selected ? (
            <>
              Viewing: <span className="font-medium text-slate-700">{selected.title}</span>{" "}
              <span className="text-slate-400">•</span> {selected.when}
            </>
          ) : (
            "Select a meeting from the left."
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
        className="text-sm font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4"
        href="https://learn.microsoft.com/microsoftteams/platform/"
        target="_blank"
        rel="noreferrer"
      >
        Teams platform docs
      </a>
    </header>
  );
}
