import type { GovernanceEvaluationInput, GovernanceEvaluationResult, GovernanceRule } from "./types";
import { evaluateDeterministically, getDefaultRules } from "./evaluator";
import { determineOutcome, scoreViolations } from "./scoring";

export interface GovernanceEngineOptions {
  /**
   * Optional custom rule set. If not provided, default rules are used.
   * Deterministic ordering is enforced regardless of input order.
   */
  rules?: GovernanceRule[];
}

/**
 * Deterministically evaluate governance for a system and compute:
 * - violations (sorted)
 * - outcome (ALLOW/FLAG/DENY)
 * - score (0..100 risk)
 *
 * This function is pure: it does not mutate input and has no I/O.
 */
// PUBLIC_INTERFACE
export function runDeterministicGovernanceEngine(
  input: GovernanceEvaluationInput,
  options: GovernanceEngineOptions = {},
): GovernanceEvaluationResult {
  const rules = options.rules ?? getDefaultRules();

  const { violations, evaluatedRuleCodes } = evaluateDeterministically(input, rules);

  const outcome = determineOutcome(violations);
  const score = scoreViolations(violations);

  return {
    outcome,
    score,
    violations,
    evaluatedRuleCodes,
  };
}
