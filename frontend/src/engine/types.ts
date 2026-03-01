/**
 * Deterministic Governance Engine - Types
 *
 * NOTE:
 * - This module is logic-only and intentionally has no runtime dependencies.
 * - It is designed to be deterministic: given the same input, it must produce the same output.
 */

/** Sovereignty levels used across the UI and API payloads. */
export type SovereigntyLevel =
  | "SOVEREIGN"
  | "APPROVED"
  | "CONDITIONAL"
  | "RESTRICTED"
  | "PROHIBITED";

/** Violation severity (aligns with existing UI labels). */
export type Severity = "CRITICAL" | "WARNING" | "INFORMATIONAL";

/** Final decision outcome (aligns with existing UI labels). */
export type Outcome = "ALLOW" | "FLAG" | "DENY";

/** Optional ID type alias (UUIDs appear frequently in API payloads). */
export type Id = string;

/** Product metadata used by the governance engine. */
export interface Product {
  productId?: Id;
  canonicalName?: string;
  vendorName?: string;
  vendorCountry?: string;
  sovereigntyLevel?: SovereigntyLevel;
  zeroCloudCapable?: boolean;

  /**
   * Optional advisory rule codes already known for this product (if provided by upstream systems).
   * Example: ["PROD-001", "PROD-002"]
   */
  advisoryRuleCodes?: string[];
}

/** Component metadata used by the governance engine. */
export interface Component {
  componentId?: Id;
  componentName?: string;
  sovereigntyLevel?: SovereigntyLevel;
  product?: Product | null;
}

/** System metadata used by the governance engine. */
export interface GovernanceSystem {
  systemId?: Id;
  systemName?: string;
  layerId?: number;

  sovereigntyLevel?: SovereigntyLevel;
  zeroCloudRequired?: boolean;
  isActive?: boolean;

  /**
   * Optional components. If not provided, component-level rules will be skipped.
   */
  components?: Component[];
}

/**
 * Input to a deterministic governance evaluation run.
 * Keep this structure stable and side-effect free.
 */
export interface GovernanceEvaluationInput {
  system: GovernanceSystem;

  /**
   * Optional downstream impact context. The deterministic engine itself does not
   * discover dependencies; callers can supply known impacted systems.
   */
  downstreamSystemIds?: Id[];
}

/** A single rule violation produced by evaluation. */
export interface GovernanceViolation {
  /** Stable rule identifier, e.g. "SOVR-001". */
  ruleCode: string;
  severity: Severity;
  message: string;

  /**
   * Optional subject identifier to help callers connect the violation to an entity.
   * Examples: "system:<id>", "component:<id>", "product:<id>"
   */
  subject?: string;

  /** Optional structured details for debugging / trace display. */
  details?: Record<string, unknown>;
}

/** Scoring breakdown for a governance evaluation. */
export interface GovernanceScore {
  /**
   * Total score, where higher means higher risk (worse).
   * Range is deterministic and clamped to [0, 100].
   */
  total: number;

  criticalCount: number;
  warningCount: number;
  informationalCount: number;
}

/**
 * Analyzer-level warning emitted during payload normalization.
 *
 * NOTE:
 * - This is not produced by the deterministic engine core today.
 * - It is part of the analyzer's public contract shape (see src/analyzer.ts).
 */
export interface NormalizationWarning {
  /** Stable analyzer warning identifier. */
  code: string;

  /** Human-readable warning message. */
  message: string;

  /** Optional structured details. */
  details?: Record<string, unknown>;
}

/** Result of a deterministic governance evaluation run. */
export interface GovernanceEvaluationResult {
  outcome: Outcome;
  score: GovernanceScore;

  /** Violations are deterministically sorted. */
  violations: GovernanceViolation[];

  /** Deterministic trace of evaluated rule codes (sorted). */
  evaluatedRuleCodes: string[];
}

/** A single governance rule definition. */
export interface GovernanceRule {
  /** Stable rule code. Used for sorting and trace output. */
  code: string;

  /** Human-readable rule summary. */
  description: string;

  /**
   * Evaluate the rule on the provided input.
   * Return:
   * - null / undefined if rule passes
   * - a single violation or array of violations if rule fails
   *
   * The engine will normalize outputs and deterministically order results.
   */
  evaluate: (input: GovernanceEvaluationInput) => GovernanceViolation | GovernanceViolation[] | null | undefined;
}
