/**
 * PUBLIC_INTERFACE
 * getGovernanceScore
 *
 * Pure deterministic governance score utility derived strictly from an existing
 * Risk Profile and Drift status.
 *
 * Model (deterministic penalties):
 * - Base = 100
 * - -15 per CRITICAL
 * - -5 per WARNING
 * - -20 if driftStatus === "DRIFTED"
 * - Clamp at minimum 0
 * - Return integer (Math.round)
 *
 * Constraints:
 * - No division-based ratios
 * - No randomness
 * - No global memoization
 * - No side effects
 *
 * @param {object} system - System object (accepted for call-site convenience; not mutated).
 * @param {{ criticalCount?: number, warningCount?: number }} riskProfile - Derived risk profile counts.
 * @param {string} driftStatus - Drift status string (case-insensitive).
 * @returns {number} Governance score (integer, 0..100)
 */
export function getGovernanceScore(system, riskProfile, driftStatus) {
  // `system` is intentionally unused beyond accepting it as a parameter.
  // This keeps the utility signature aligned with call-sites while remaining pure.
  void system;

  const criticalCount = Number.isFinite(riskProfile?.criticalCount)
    ? riskProfile.criticalCount
    : 0;
  const warningCount = Number.isFinite(riskProfile?.warningCount)
    ? riskProfile.warningCount
    : 0;

  const driftKey = String(driftStatus ?? "").trim().toUpperCase();

  const base = 100;
  const penaltyCritical = criticalCount * 15;
  const penaltyWarning = warningCount * 5;
  const penaltyDrift = driftKey === "DRIFTED" ? 20 : 0;

  const raw = base - penaltyCritical - penaltyWarning - penaltyDrift;
  const clamped = Math.max(0, raw);

  return Math.round(clamped);
}
