import { getRiskProfileForSystem } from "./getRiskProfileForSystem";
import { getGovernanceDriftStatus } from "./getGovernanceDriftStatus";

/**
 * @typedef {"A" | "B" | "C" | "D" | "F" | "N/A"} GovernanceGrade
 */

/**
 * Clamp a number to [min, max] deterministically.
 *
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * @param {number} score
 * @returns {GovernanceGrade}
 */
function gradeForScore(score) {
  if (!Number.isFinite(score)) return "N/A";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * @param {any} level
 * @returns {number}
 */
function sovereigntyPenaltyForLevel(level) {
  const key = String(level ?? "").trim().toUpperCase();
  const map = {
    SOVEREIGN: 0,
    APPROVED: 5,
    CONDITIONAL: 15,
    RESTRICTED: 30,
    PROHIBITED: 50,
  };
  return map[key] ?? 0;
}

/**
 * PUBLIC_INTERFACE
 * getGovernanceScoreForSystem
 *
 * Deterministically computes a single governance score for a system by aggregating
 * multiple governance signals derived purely from the provided inputs.
 *
 * Determinism constraints:
 * - No randomness
 * - No Date.now()
 * - No API calls
 * - No mutation of the system object
 *
 * Scoring model (0..100):
 * - Start from 100
 * - Apply penalties:
 *   - criticalCount * 25
 *   - warningCount  * 10
 *   - infoCount     * 2
 *   - drifted penalty: 15 (only when drift status === "drifted")
 *   - layer inconsistency penalty: 10 (only when options.layerIsConsistent === false)
 *   - inactive penalty: 5 (only when system.is_active === false)
 *   - sovereignty penalty: based on system.sovereignty_level
 * - Clamp to [0, 100] and round to an integer.
 *
 * Notes:
 * - Drift status is derived by calling getGovernanceDriftStatus with a derived
 *   current risk profile injected as `currentRiskProfile` (without mutating input).
 * - "no-baseline" is treated as informational (no penalty), since baseline data
 *   may not be present in list views.
 *
 * @param {object} system
 * @param {{ layerIsConsistent?: boolean | null }} [options]
 * @returns {{
 *   score: number,
 *   grade: GovernanceGrade,
 *   rawScore: number,
 *   penalties: {
 *     critical: number,
 *     warning: number,
 *     info: number,
 *     drift: number,
 *     layerInconsistency: number,
 *     inactive: number,
 *     sovereignty: number
 *   },
 *   signals: {
 *     riskProfile: { totalRules: number, criticalCount: number, warningCount: number, infoCount: number },
 *     driftStatus: "stable" | "drifted" | "no-baseline",
 *     layerIsConsistent: boolean | null,
 *     sovereigntyLevel: any,
 *     isActive: boolean | null
 *   }
 * }}
 */
export function getGovernanceScoreForSystem(system, options = {}) {
  if (!system || typeof system !== "object") {
    return {
      score: 0,
      grade: "N/A",
      rawScore: 0,
      penalties: {
        critical: 0,
        warning: 0,
        info: 0,
        drift: 0,
        layerInconsistency: 0,
        inactive: 0,
        sovereignty: 0,
      },
      signals: {
        riskProfile: { totalRules: 0, criticalCount: 0, warningCount: 0, infoCount: 0 },
        driftStatus: "no-baseline",
        layerIsConsistent: options?.layerIsConsistent ?? null,
        sovereigntyLevel: null,
        isActive: null,
      },
    };
  }

  // Risk profile (deterministic, derived from rules only)
  const riskProfile = system?.currentRiskProfile ?? getRiskProfileForSystem(system);

  const drift = getGovernanceDriftStatus({ ...system, currentRiskProfile: riskProfile });

  const penalties = {
    critical: (riskProfile.criticalCount ?? 0) * 25,
    warning: (riskProfile.warningCount ?? 0) * 10,
    info: (riskProfile.infoCount ?? 0) * 2,
    drift: drift.status === "drifted" ? 15 : 0,
    layerInconsistency: options?.layerIsConsistent === false ? 10 : 0,
    inactive: system?.is_active === false ? 5 : 0,
    sovereignty: sovereigntyPenaltyForLevel(system?.sovereignty_level),
  };

  const rawScore =
    100 -
    penalties.critical -
    penalties.warning -
    penalties.info -
    penalties.drift -
    penalties.layerInconsistency -
    penalties.inactive -
    penalties.sovereignty;

  const score = Math.round(clamp(rawScore, 0, 100));
  const grade = gradeForScore(score);

  return {
    score,
    grade,
    rawScore,
    penalties,
    signals: {
      riskProfile,
      driftStatus: drift.status,
      layerIsConsistent: options?.layerIsConsistent ?? null,
      sovereigntyLevel: system?.sovereignty_level ?? null,
      isActive: typeof system?.is_active === "boolean" ? system.is_active : null,
    },
  };
}
