import { getRiskProfileForSystem } from "./getRiskProfileForSystem";

/**
 * Attempt to parse a timestamp-like value into a comparable number.
 * This is deterministic (no Date.now) and depends only on the input value.
 *
 * @param {any} ts
 * @returns {number|null}
 */
function toTimestampNumber(ts) {
  if (typeof ts === "number" && Number.isFinite(ts)) return ts;
  if (typeof ts === "string") {
    const ms = Date.parse(ts);
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

/**
 * Extract a risk profile object ({ totalRules, criticalCount, warningCount, infoCount })
 * from a history entry that may store it either at the top-level or nested under
 * a common key.
 *
 * @param {any} entry
 * @returns {{ totalRules: number, criticalCount: number, warningCount: number, infoCount: number } | null}
 */
function extractRiskProfileFromHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") return null;

  const candidates = [
    entry,
    entry.risk_profile,
    entry.riskProfile,
    entry.risk_profile_snapshot,
    entry.riskProfileSnapshot,
    entry.snapshot,
    entry.baseline,
    entry.profile,
  ];

  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;

    const totalRules =
      c.totalRules ?? c.total_rules ?? c.total ?? c.total_rules_count ?? undefined;
    const criticalCount =
      c.criticalCount ?? c.critical_count ?? c.critical ?? undefined;
    const warningCount =
      c.warningCount ?? c.warning_count ?? c.warning ?? undefined;
    const infoCount = c.infoCount ?? c.info_count ?? c.info ?? undefined;

    if (
      typeof totalRules === "number" &&
      typeof criticalCount === "number" &&
      typeof warningCount === "number" &&
      typeof infoCount === "number" &&
      Number.isFinite(totalRules) &&
      Number.isFinite(criticalCount) &&
      Number.isFinite(warningCount) &&
      Number.isFinite(infoCount)
    ) {
      return { totalRules, criticalCount, warningCount, infoCount };
    }
  }

  return null;
}

/**
 * Deterministically selects the most recent history entry.
 * - If timestamp-like fields exist, choose the highest timestamp.
 * - Otherwise, fall back to the last index (assumes pre-sorted).
 *
 * @param {Array<any>} history
 * @returns {any|null}
 */
function selectMostRecentHistoryEntry(history) {
  if (!Array.isArray(history) || history.length === 0) return null;

  // Common timestamp keys in priority order (but we still take the maximum).
  const timestampKeys = [
    "timestamp",
    "triggered_at",
    "evaluated_at",
    "created_at",
    "updated_at",
    "at",
    "time",
  ];

  let bestEntry = null;
  let bestTs = null;

  for (const entry of history) {
    if (!entry || typeof entry !== "object") continue;

    let entryTs = null;
    for (const k of timestampKeys) {
      if (entryTs !== null) break;
      entryTs = toTimestampNumber(entry[k]);
    }

    if (entryTs === null) continue;

    if (bestTs === null || entryTs > bestTs) {
      bestTs = entryTs;
      bestEntry = entry;
    }
  }

  // If no timestamp fields are usable, deterministically assume array is pre-sorted
  // and use the last element.
  return bestEntry ?? history[history.length - 1];
}

/**
 * PUBLIC_INTERFACE
 * getGovernanceDriftStatus
 *
 * Detects whether a system’s current Risk Profile deviates from its most recent
 * historical snapshot (baseline).
 *
 * Drift definition:
 * A system is "drifted" if ANY of the following differ from baseline:
 * - totalRules
 * - criticalCount
 * - warningCount
 * - infoCount
 *
 * If identical → "stable"
 * If no history (or no usable baseline) → "no-baseline"
 *
 * Constraints:
 * - No API calls
 * - No mutation of system objects or history arrays
 * - Deterministic baseline selection (highest timestamp OR last index if sorted)
 * - Strict equality comparison for numeric fields
 *
 * @param {object} system - Full system object; may include `currentRiskProfile` and `evaluation_history`.
 * @returns {{ status: "stable" | "drifted" | "no-baseline", baseline: { totalRules: number, criticalCount: number, warningCount: number, infoCount: number } | null }}
 */
export function getGovernanceDriftStatus(system) {
  const history = Array.isArray(system?.evaluation_history)
    ? system.evaluation_history
    : [];

  if (history.length === 0) {
    return { status: "no-baseline", baseline: null };
  }

  const baselineEntry = selectMostRecentHistoryEntry(history);
  const baseline = extractRiskProfileFromHistoryEntry(baselineEntry);

  if (!baseline) {
    // No usable snapshot to compare against.
    return { status: "no-baseline", baseline: null };
  }

  // Prefer a derived risk profile passed in by the caller, otherwise derive it deterministically.
  const current = system?.currentRiskProfile ?? getRiskProfileForSystem(system);

  const isStable =
    current?.totalRules === baseline.totalRules &&
    current?.criticalCount === baseline.criticalCount &&
    current?.warningCount === baseline.warningCount &&
    current?.infoCount === baseline.infoCount;

  return {
    status: isStable ? "stable" : "drifted",
    baseline,
  };
}
