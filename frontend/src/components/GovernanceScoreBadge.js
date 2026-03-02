import React from "react";

/**
 * @param {number|null|undefined} score
 * @returns {"high" | "medium" | "low" | "unknown"}
 */
function toneForScore(score) {
  if (!Number.isFinite(score)) return "unknown";
  if (score >= 85) return "high";
  if (score >= 70) return "medium";
  return "low";
}

/**
 * PUBLIC_INTERFACE
 * GovernanceScoreBadge
 *
 * Small deterministic badge for displaying a system governance score (0..100) and grade.
 *
 * @param {{ score: number, grade?: string, className?: string }} props
 * @returns {JSX.Element}
 */
export default function GovernanceScoreBadge({ score, grade, className }) {
  const tone = toneForScore(score);

  const clsMap = {
    high: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    low: "bg-red-500/15 text-red-300 border-red-500/30",
    unknown: "bg-slate-700/30 text-slate-300 border-slate-700",
  };

  const cls = clsMap[tone] ?? clsMap.unknown;
  const label = Number.isFinite(score) ? `GOV ${score}` : "GOV —";
  const title = `Governance score${grade ? ` (${grade})` : ""}`;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${cls} ${
        className ?? ""
      }`}
    >
      <span className="uppercase tracking-wide">{label}</span>
      {grade ? <span className="text-[10px] opacity-80">({grade})</span> : null}
    </span>
  );
}
