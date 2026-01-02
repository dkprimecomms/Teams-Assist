// src/components/ui/Card.jsx
import React from "react";

export default function Card({
  title,
  subtitle,
  children,
  className = "",
  bodyClassName = "",
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        "flex flex-col min-h-0 w-full",
        className,
      ].join(" ")}
    >
      <div className="p-4 border-b border-slate-200">
        {/* ✅ use div so title can be JSX safely */}
        <div className="text-base font-semibold text-slate-900">{title}</div>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>

      <div className={["p-4 flex-1 min-h-0", bodyClassName].join(" ")}>
        {children}
      </div>
    </section>
  );
}
