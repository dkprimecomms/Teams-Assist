//src/components/sidebar/TabButton.jsx
import React from "react";

export default function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-1 text-center py-2 text-[13.5px] whitespace-nowrap transition-colors duration-200",
        active ? "text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900",
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}
