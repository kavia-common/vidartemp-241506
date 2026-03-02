import React from "react";

const COLOURS = {
  SOVEREIGN:   "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  APPROVED:    "bg-blue-500/15 text-blue-300 border-blue-500/30",
  CONDITIONAL: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  RESTRICTED:  "bg-orange-500/15 text-orange-300 border-orange-500/30",
  PROHIBITED:  "bg-red-500/15 text-red-300 border-red-500/30",
};

export default function SovereigntyBadge({ level }) {
  const cls = COLOURS[level] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono font-semibold tracking-wide ${cls}`}
    >
      {level ?? "—"}
    </span>
  );
}
