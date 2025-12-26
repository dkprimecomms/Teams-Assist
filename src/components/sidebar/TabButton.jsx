import React from "react";

export default function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-md border border-black px-3 py-1 text-sm",
        "shadow-[0_0_0_0_black] hover:shadow-[2px_2px_0_0_black] active:translate-x-[1px] active:translate-y-[1px]",
        active ? "bg-white font-semibold" : "bg-white/70",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
