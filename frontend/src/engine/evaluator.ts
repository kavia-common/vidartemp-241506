import type {
  Component,
  GovernanceEvaluationInput,
  GovernanceRule,
  GovernanceViolation,
  Product,
  SovereigntyLevel,
} from "./types";
import { compareViolationsDeterministically } from "./scoring";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function sortByCodeDeterministically<T extends { code: string }>(rules: T[]): T[] {
  return [...rules].sort((a, b) => safeStr(a.code).localeCompare(safeStr(b.code)));
}

function normalizeViolations(
  ruleCode: string,
  out: GovernanceViolation | GovernanceViolation[] | null | undefined,
): GovernanceViolation[] {
  if (!out) return [];
  const arr = Array.isArray(out) ? out : [out];
  // Ensure the ruleCode is always present and stable.
  return arr
    .filter(Boolean)
    .map((v) => ({
      ...v,
      ruleCode: v.ruleCode || ruleCode,
      message: safeStr(v.message),
    }));
}

function sovereigntyRank(level?: SovereigntyLevel): number {
  // Higher rank = better sovereignty.
  const map: Record<SovereigntyLevel, number> = {
    SOVEREIGN: 5,
    APPROVED: 4,
    CONDITIONAL: 3,
    RESTRICTED: 2,
    PROHIBITED: 1,
  };
  return level ? map[level] ?? 0 : 0;
}

function componentSubject(c: Component): string | undefined {
  if (c.componentId) return `component:${c.componentId}`;
  if (c.componentName) return `component:${c.componentName}`;
  return undefined;
}

function productSubject(p: Product): string | undefined {
  if (p.productId) return `product:${p.productId}`;
  if (p.canonicalName) return `product:${p.canonicalName}`;
  return undefined;
}

/**
 * Default, logic-only ruleset.
 *
 * These rules are intentionally conservative and only fire when relevant data
 * is present in the input. Callers can extend/override by providing custom rules.
 */
const DEFAULT_RULES: GovernanceRule[] = [
  {
    code: "SOVR-001",
    description: "System sovereignty must not be PROHIBITED; RESTRICTED is a warning.",
    evaluate: (input) => {
      const sys = input.system;
      const lvl = sys.sovereigntyLevel;

      if (!lvl) return null;

      if (lvl === "PROHIBITED") {
        return {
          ruleCode: "SOVR-001",
          severity: "CRITICAL",
          subject: sys.systemId ? `system:${sys.systemId}` : sys.systemName ? `system:${sys.systemName}` : "system",
          message: "System sovereignty is PROHIBITED.",
          details: { sovereigntyLevel: lvl },
        };
      }

      if (lvl === "RESTRICTED") {
        return {
          ruleCode: "SOVR-001",
          severity: "WARNING",
          subject: sys.systemId ? `system:${sys.systemId}` : sys.systemName ? `system:${sys.systemName}` : "system",
          message: "System sovereignty is RESTRICTED.",
          details: { sovereigntyLevel: lvl },
        };
      }

      return null;
    },
  },

  {
    code: "SOVR-002",
    description: "Component sovereignty must not be worse than the system sovereignty.",
    evaluate: (input) => {
      const sys = input.system;
      const comps = sys.components ?? [];
      if (!Array.isArray(comps) || comps.length === 0) return null;

      const sysRank = sovereigntyRank(sys.sovereigntyLevel);

      const violations: GovernanceViolation[] = [];
      for (const c of comps) {
        const cRank = sovereigntyRank(c?.sovereigntyLevel);
        if (!c?.sovereigntyLevel) continue;
        if (sysRank > 0 && cRank > 0 && cRank < sysRank) {
          // Severity is deterministic: if component is PROHIBITED => CRITICAL, else WARNING.
          const severity = c.sovereigntyLevel === "PROHIBITED" ? "CRITICAL" : "WARNING";
          violations.push({
            ruleCode: "SOVR-002",
            severity,
            subject: componentSubject(c),
            message: `Component sovereignty (${c.sovereigntyLevel}) is worse than system sovereignty (${sys.sovereigntyLevel}).`,
            details: {
              componentSovereignty: c.sovereigntyLevel,
              systemSovereignty: sys.sovereigntyLevel,
              componentId: c.componentId,
              componentName: c.componentName,
            },
          });
        }
      }

      return violations.length ? violations : null;
    },
  },

  {
    code: "ZC-001",
    description: "If a system requires Zero-Cloud, all linked products must be Zero-Cloud capable when known.",
    evaluate: (input) => {
      const sys = input.system;
      if (!sys.zeroCloudRequired) return null;

      const comps = sys.components ?? [];
      if (!Array.isArray(comps) || comps.length === 0) return null;

      const violations: GovernanceViolation[] = [];

      for (const c of comps) {
        const p = c?.product;
        if (!p) continue;

        if (p.zeroCloudCapable === false) {
          violations.push({
            ruleCode: "ZC-001",
            severity: "CRITICAL",
            subject: productSubject(p) ?? componentSubject(c),
            message: "Zero-Cloud is required but a linked product is not Zero-Cloud capable.",
            details: {
              systemId: sys.systemId,
              systemName: sys.systemName,
              componentId: c.componentId,
              componentName: c.componentName,
              productId: p.productId,
              canonicalName: p.canonicalName,
              zeroCloudCapable: p.zeroCloudCapable,
            },
          });
        }
      }

      return violations.length ? violations : null;
    },
  },

  {
    code: "PROD-001",
    description: "Product advisory rule code presence triggers a warning (when advisory codes are provided).",
    evaluate: (input) => {
      const sys = input.system;
      const comps = sys.components ?? [];
      if (!Array.isArray(comps) || comps.length === 0) return null;

      const violations: GovernanceViolation[] = [];

      for (const c of comps) {
        const p = c?.product;
        const adv = p?.advisoryRuleCodes ?? [];
        if (!p || !Array.isArray(adv) || adv.length === 0) continue;

        // Deterministically fire a warning for each known advisory code on the product.
        // Only codes starting with "PROD-" are considered product advisories.
        const prodCodes = adv.filter((code) => safeStr(code).toUpperCase().startsWith("PROD-"));
        prodCodes.sort((a, b) => safeStr(a).localeCompare(safeStr(b)));

        for (const code of prodCodes) {
          violations.push({
            ruleCode: safeStr(code) || "PROD-001",
            severity: "WARNING",
            subject: productSubject(p),
            message: `Product advisory present: ${safeStr(code)}.`,
            details: {
              componentId: c.componentId,
              componentName: c.componentName,
              productId: p.productId,
              canonicalName: p.canonicalName,
              vendorName: p.vendorName,
              vendorCountry: p.vendorCountry,
            },
          });
        }
      }

      return violations.length ? violations : null;
    },
  },
];

/**
 * Return the default ruleset (as a defensive copy).
 */
// PUBLIC_INTERFACE
export function getDefaultRules(): GovernanceRule[] {
  return sortByCodeDeterministically(DEFAULT_RULES);
}

/**
 * Evaluate rules deterministically.
 *
 * - Rules are applied in stable order (by rule code).
 * - Violations are normalized and then deterministically sorted.
 */
// PUBLIC_INTERFACE
export function evaluateDeterministically(
  input: GovernanceEvaluationInput,
  rules: GovernanceRule[] = getDefaultRules(),
): { violations: GovernanceViolation[]; evaluatedRuleCodes: string[] } {
  const orderedRules = sortByCodeDeterministically(rules);

  const evaluatedRuleCodes: string[] = [];
  const allViolations: GovernanceViolation[] = [];

  for (const rule of orderedRules) {
    evaluatedRuleCodes.push(rule.code);

    const out = rule.evaluate(input);
    const vios = normalizeViolations(rule.code, out);
    for (const v of vios) allViolations.push(v);
  }

  allViolations.sort(compareViolationsDeterministically);

  return {
    violations: allViolations,
    evaluatedRuleCodes: [...evaluatedRuleCodes].sort((a, b) => safeStr(a).localeCompare(safeStr(b))),
  };
}
