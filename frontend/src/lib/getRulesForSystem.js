/**
 * Rule metadata selector utilities.
 *
 * NOTE: This module is intentionally pure and performs no memoization.
 * Memoization is handled at the component level per requirements.
 */

/**
 * PUBLIC_INTERFACE
 * getRulesForSystem
 *
 * Returns the rule metadata list associated with a given system object.
 * This is a defensive selector that supports multiple possible shapes of the
 * system payload while staying deterministic and side-effect free.
 *
 * @param {object} system - A system object as provided by the existing frontend data flow.
 * @returns {Array<object>} Array of rule metadata objects (each expected to have `severity`).
 */
export function getRulesForSystem(system) {
  if (!system || typeof system !== "object") return [];

  // Most likely shapes (kept in priority order; no sorting/mutation).
  const candidates = [
    system.rule_trace?.rules,
    system.ruleTrace?.rules,
    system.rule_trace,
    system.ruleTrace,
    system.rules,
    system.rule_metadata,
    system.ruleMetadata,
    system.governance_rules,
    system.governanceRules,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }

  return [];
}
