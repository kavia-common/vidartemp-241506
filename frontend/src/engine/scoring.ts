import type { GovernanceScore, GovernanceViolation, Outcome, Severity } from "./types";

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 3,
  WARNING: 2,
  INFORMATIONAL: 1,
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICAL: 50,
  WARNING: 15,
  INFORMATIONAL: 5,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/**
 * Deterministic comparator for violations:
 * 1) severity desc
 * 2) ruleCode asc
 * 3) subject asc
 * 4) message asc
 */
// PUBLIC_INTERFACE
export function compareViolationsDeterministically(a: GovernanceViolation, b: GovernanceViolation): number {
  const sev = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
  if (sev !== 0) return sev;

  const rc = safeStr(a.ruleCode).localeCompare(safeStr(b.ruleCode));
  if (rc !== 0) return rc;

  const subj = safeStr(a.subject).localeCompare(safeStr(b.subject));
  if (subj !== 0) return subj;

  return safeStr(a.message).localeCompare(safeStr(b.message));
}

/**
 * Derive an outcome deterministically from a violation set:
 * - any CRITICAL => DENY
 * - else any WARNING => FLAG
 * - else => ALLOW
 */
// PUBLIC_INTERFACE
export function determineOutcome(violations: GovernanceViolation[]): Outcome {
  let hasCritical = false;
  let hasWarning = false;

  for (const v of violations) {
    if (v.severity === "CRITICAL") hasCritical = true;
    else if (v.severity === "WARNING") hasWarning = true;
  }

  if (hasCritical) return "DENY";
  if (hasWarning) return "FLAG";
  return "ALLOW";
}

/**
 * Score violations deterministically.
 * Higher score means higher risk. Score is clamped to [0, 100].
 *
 * Weights are intentionally simple and fully deterministic.
 */
// PUBLIC_INTERFACE
export function scoreViolations(violations: GovernanceViolation[]): GovernanceScore {
  let criticalCount = 0;
  let warningCount = 0;
  let informationalCount = 0;

  for (const v of violations) {
    if (v.severity === "CRITICAL") criticalCount += 1;
    else if (v.severity === "WARNING") warningCount += 1;
    else informationalCount += 1;
  }

  const raw =
    criticalCount * SEVERITY_WEIGHT.CRITICAL +
    warningCount * SEVERITY_WEIGHT.WARNING +
    informationalCount * SEVERITY_WEIGHT.INFORMATIONAL;

  // Clamp to a stable 0..100 range.
  const total = clamp(raw, 0, 100);

  return { total, criticalCount, warningCount, informationalCount };
}
