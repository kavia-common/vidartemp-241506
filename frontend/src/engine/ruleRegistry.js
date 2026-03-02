/*
 * Deterministic, metadata-only rule registry.
 *
 * IMPORTANT:
 * - This file contains NO evaluation logic whatsoever.
 * - All rule evaluation is performed by the backend.
 * - This registry exists solely for displaying rule metadata in the UI.
 * - Deterministic only: stable literals (no Date.now(), Math.random(), etc.).
 * - No runtime mutation: exports are frozen / readonly and must not be mutated by callers.
 */

/**
 * Analyzer-level policy version constant.
 *
 * This is intentionally a simple string literal export so other parts of the frontend
 * can report or display which policy version they are aligned to, without affecting
 * evaluation semantics.
 */
export const POLICY_VERSION = "1.0.0";

/**
 * Rule registry entry (metadata-only for UI display).
 *
 * Required display fields (per specification):
 * - ruleName
 * - ruleType
 * - severity
 * - constraintDescription
 * - sourceReferenceKey
 *
 * Existing fields kept for backwards compatibility with the current UI:
 * - ruleCode
 * - domain
 * - description
 * - documentReference
 * - introducedInPolicyVersion
 *
 * Targeting fields (metadata-only):
 * - targetLayers: list of system.layer_id values this rule traces to (preferred)
 *
 * Legacy (still tolerated by selectors for backwards compatibility, but should not be used):
 * - targets / systems / systemIds / system_names
 *
 * NOTE: This registry is metadata-only for UI display purposes. The backend performs all evaluation.
 *
 * @typedef {Object} RuleRegistryEntry
 * @property {string} ruleCode - Stable canonical rule code (primary key).
 * @property {string} ruleName - Human-readable rule name (for display).
 * @property {string} ruleType - Display-only classification (e.g., "SOVEREIGNTY", "INTEGRITY").
 * @property {"CRITICAL"|"WARNING"|"INFO"} severity - Display-only severity indicator.
 * @property {string} constraintDescription - Display-only constraint/requirement statement.
 * @property {string} sourceReferenceKey - Stable key for tracing to source docs/policy text.
 * @property {string} domain - Display-only domain grouping (e.g., "governance").
 * @property {string} description - Short summary (kept for existing UI).
 * @property {string} documentReference - Human readable document reference (kept for existing UI).
 * @property {string} introducedInPolicyVersion - Policy version where rule was introduced.
 * @property {(string|number)[]|undefined} targetLayers - Metadata-only layer targeting; matched against system.layer_id.
 * @property {string[]|undefined} targets - DEPRECATED legacy targeting field (do not use).
 * @property {string[]|undefined} systems - DEPRECATED legacy targeting field (do not use).
 * @property {string[]|undefined} systemIds - DEPRECATED legacy targeting field (do not use).
 * @property {string[]|undefined} system_names - DEPRECATED legacy targeting field (do not use).
 */

/**
 * Backwards-compatible alias for "metadata".
 *
 * @typedef {RuleRegistryEntry} RuleMetadata
 */

/**
 * Canonical registry map (keyed by ruleCode).
 *
 * @typedef {Object.<string, RuleRegistryEntry>} RuleRegistryMap
 */

/*
 * The canonical registry map (keyed by ruleCode).
 *
 * Determinism rules:
 * - Keep as a literal object.
 * - Keep ordering stable (append new keys; do not reorder without intent).
 * - Do not compute fields dynamically.
 *
 * NOTE: This registry is metadata-only for UI display. All evaluation is backend-authoritative.
 *
 * Targeting:
 * - Rules are associated to systems *only* via `targetLayers` (matched against `system.layer_id`).
 * - No wildcard targets are used.
 */
const RULE_REGISTRY_INTERNAL = {
  // Append-only ordering (authoritative list order). Do not reorder.
  "SOVR-001": {
    ruleCode: "SOVR-001",
    ruleName: "System sovereignty level must be declared",
    ruleType: "SOVEREIGNTY",
    severity: "CRITICAL",
    constraintDescription:
      "Every system must declare a sovereignty level (sovereignty_level) for governance and traceability.",
    sourceReferenceKey: "canonical-governance:SOVR-001",
    domain: "governance",
    description: "Metadata display: Each system requires an explicit sovereignty classification.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [1],
  },
  "SOVR-002": {
    ruleCode: "SOVR-002",
    ruleName: "Zero-cloud requirement must be visible at system level",
    ruleType: "SOVEREIGNTY",
    severity: "WARNING",
    constraintDescription:
      "Systems requiring zero-cloud operation must surface the zero_cloud_required indicator for governance review.",
    sourceReferenceKey: "canonical-governance:SOVR-002",
    domain: "governance",
    description: "Metadata display: Zero-cloud requirement must be traceable in metadata.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [1],
  },
  "SOVR-003": {
    ruleCode: "SOVR-003",
    ruleName: "Inactive systems must be clearly marked",
    ruleType: "SOVEREIGNTY",
    severity: "INFO",
    constraintDescription:
      "Systems that are not active must be marked as inactive (is_active=false) so governance traces interpret them correctly.",
    sourceReferenceKey: "canonical-governance:SOVR-003",
    domain: "governance",
    description: "Metadata display: Tracks whether a system is active/inactive for traceability.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [1],
  },
  "SOVR-004": {
    ruleCode: "SOVR-004",
    ruleName: "System layer assignment must be present",
    ruleType: "SOVEREIGNTY",
    severity: "WARNING",
    constraintDescription:
      "Every system should have a layer assignment (layer_id) to support deterministic exploration and trace grouping.",
    sourceReferenceKey: "canonical-governance:SOVR-004",
    domain: "governance",
    description: "Metadata display: Systems can be grouped and explored by layer.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [1],
  },
  "COMP-001": {
    ruleCode: "COMP-001",
    ruleName: "Components must be linked to a system",
    ruleType: "COMPLIANCE",
    severity: "CRITICAL",
    constraintDescription:
      "Active components must be attributable to a system to maintain governance trace integrity.",
    sourceReferenceKey: "canonical-governance:COMP-001",
    domain: "governance",
    description: "Metadata display: Component inventory can be traced to a system boundary.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [2],
  },
  "CINT-001": {
    ruleCode: "CINT-001",
    ruleName: "Interfaces must be discoverable for dependency mapping",
    ruleType: "INTEGRITY",
    severity: "WARNING",
    constraintDescription:
      "Systems should expose sufficient interface metadata to build a dependency map (upstream/downstream).",
    sourceReferenceKey: "canonical-governance:CINT-001",
    domain: "governance",
    description: "Metadata display: Supports deterministic dependency map rendering.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [3],
  },
  "CINT-002": {
    ruleCode: "CINT-002",
    ruleName: "Upstream/downstream relationships must be consistent",
    ruleType: "INTEGRITY",
    severity: "WARNING",
    constraintDescription:
      "Recorded upstream/downstream relationships should be consistent to avoid broken governance traces.",
    sourceReferenceKey: "canonical-governance:CINT-002",
    domain: "governance",
    description: "Metadata display: Keeps dependency relationships consistent for exploration views.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [3],
  },
  "CINT-003": {
    ruleCode: "CINT-003",
    ruleName: "Component inventory should include product linkage when available",
    ruleType: "INTEGRITY",
    severity: "INFO",
    constraintDescription:
      "Components should be linked to a product record when a canonical product is known (metadata-only linkage).",
    sourceReferenceKey: "canonical-governance:CINT-003",
    domain: "governance",
    description: "Metadata display: Improves product traceability in component inventory views.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [3],
  },
  "SUBS-001": {
    ruleCode: "SUBS-001",
    ruleName: "Subscription/entitlement state must be traceable",
    ruleType: "SUBSCRIPTION",
    severity: "INFO",
    constraintDescription:
      "Subscription and entitlement states should be traceable in governance events to support review workflows.",
    sourceReferenceKey: "canonical-governance:SUBS-001",
    domain: "governance",
    description: "Metadata display: Subscription-related governance actions are traceable.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [4],
  },
  "INTF-001": {
    ruleCode: "INTF-001",
    ruleName: "Interface definitions must be traceable to systems",
    ruleType: "INTERFACE",
    severity: "WARNING",
    constraintDescription:
      "Interfaces should be defined such that they can be traced to producing/consuming systems in dependency maps.",
    sourceReferenceKey: "canonical-governance:INTF-001",
    domain: "governance",
    description: "Metadata display: Supports rendering upstream/downstream interfaces for a system.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [5],
  },
  "PROD-001": {
    ruleCode: "PROD-001",
    ruleName: "Product metadata should include canonical name and vendor",
    ruleType: "PRODUCT",
    severity: "INFO",
    constraintDescription:
      "When a product is linked, canonical product name and vendor details should be present for traceability.",
    sourceReferenceKey: "canonical-governance:PROD-001",
    domain: "governance",
    description: "Metadata display: Improves traceability of vendor/product in the system inventory.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [6],
  },
  "PROD-002": {
    ruleCode: "PROD-002",
    ruleName: "Zero-cloud capability should be explicit in product metadata",
    ruleType: "PRODUCT",
    severity: "WARNING",
    constraintDescription:
      "Linked products should declare whether they are zero-cloud capable to support sovereign compliance views.",
    sourceReferenceKey: "canonical-governance:PROD-002",
    domain: "governance",
    description: "Metadata display: Shows product zero-cloud capability in inventory tables.",
    documentReference: "Canonical Governance Rules",
    introducedInPolicyVersion: "1.0.0",
    targetLayers: [6],
  },
};

/*
 * Frozen, readonly registry (metadata-only, deterministic semantics).
 *
 * We freeze at runtime to defend against accidental mutation in JS consumers.
 */
/** @type {RuleRegistryMap} */
export const RULE_REGISTRY = Object.freeze(RULE_REGISTRY_INTERNAL);

/*
 * Deterministic lookup map for rule metadata by code.
 *
 * This separate export preserves prior public surface area and calling patterns.
 */
/** @type {RuleRegistryMap} */
export const RULE_REGISTRY_BY_CODE = RULE_REGISTRY;

/*
 * Deterministic readonly list view of the registry entries.
 *
 * This is a literal list in authoritative order (no dynamic computation).
 */
/** @type {readonly RuleRegistryEntry[]} */
const RULE_REGISTRY_LIST = Object.freeze([
  RULE_REGISTRY_INTERNAL["SOVR-001"],
  RULE_REGISTRY_INTERNAL["SOVR-002"],
  RULE_REGISTRY_INTERNAL["SOVR-003"],
  RULE_REGISTRY_INTERNAL["SOVR-004"],
  RULE_REGISTRY_INTERNAL["COMP-001"],
  RULE_REGISTRY_INTERNAL["CINT-001"],
  RULE_REGISTRY_INTERNAL["CINT-002"],
  RULE_REGISTRY_INTERNAL["CINT-003"],
  RULE_REGISTRY_INTERNAL["SUBS-001"],
  RULE_REGISTRY_INTERNAL["INTF-001"],
  RULE_REGISTRY_INTERNAL["PROD-001"],
  RULE_REGISTRY_INTERNAL["PROD-002"],
]);

/**
 * PUBLIC_INTERFACE
 * Get metadata for a given rule code, if it exists in the registry.
 *
 * @param {string} ruleCode - The rule code to look up.
 * @returns {RuleMetadata|undefined} The associated rule metadata if present; otherwise undefined.
 */
export function getRuleMetadata(ruleCode) {
  return RULE_REGISTRY_BY_CODE[ruleCode];
}

/**
 * PUBLIC_INTERFACE
 * List all registered rule metadata entries as a readonly array.
 *
 * @returns {readonly RuleMetadata[]} A frozen readonly array of all rule metadata entries.
 */
export function listRuleMetadata() {
  return RULE_REGISTRY_LIST;
}
