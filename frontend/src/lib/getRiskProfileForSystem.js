import { getRulesForSystem } from "./getRulesForSystem";

/**
 * PUBLIC_INTERFACE
 * getRiskProfileForSystem
 *
 * Deterministically derives a risk profile from existing rule metadata.
 * - Uses `getRulesForSystem(system)` to obtain rule metadata.
 * - Counts are derived from `rule.severity` only.
 * - No weighting, scoring, sorting, or side effects.
 *
 * @param {object} system - The system object.
 * @returns {{ totalRules: number, criticalCount: number, warningCount: number, infoCount: number }}
 */
export function getRiskProfileForSystem(system) {
  const rules = getRulesForSystem(system);

  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const rule of rules) {
    const sev = String(rule?.severity ?? "").trim().toUpperCase();

    if (sev === "CRITICAL") {
      criticalCount += 1;
    } else if (sev === "WARNING") {
      warningCount += 1;
    } else if (sev === "INFORMATIONAL" || sev === "INFO" || sev === "INFORMATION") {
      infoCount += 1;
    } else {
      // Unknown severities are intentionally ignored to keep the output deterministic
      // and scoped to the explicitly requested buckets.
    }
  }

  return {
    totalRules: rules.length,
    criticalCount,
    warningCount,
    infoCount,
  };
}
