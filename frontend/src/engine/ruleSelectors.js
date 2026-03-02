/**
 * Rule selectors (frontend-only).
 *
 * IMPORTANT:
 * - Metadata-only: selectors must not execute rules, score, or mutate the registry.
 * - Deterministic: results must be ordered deterministically without relying on engine sort stability.
 * - Strict purity: no module-level mutable caches or memoization state.
 */

import { listRuleMetadata } from "./ruleRegistry";

/**
 * Normalize a candidate value into a flat list of string references.
 * Supports common shapes:
 *  - string
 *  - array of strings
 *  - array of objects containing ids/names
 *  - object containing ids/names
 *
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeRefs(value) {
  if (!value) return [];

  if (typeof value === "string") return [value];

  if (Array.isArray(value)) {
    return value.flatMap((v) => normalizeRefs(v)).filter(Boolean);
  }

  if (typeof value === "object") {
    const obj = /** @type {Record<string, unknown>} */ (value);
    const candidates = [
      obj.system_id,
      obj.systemId,
      obj.id,
      obj.system_name,
      obj.systemName,
      obj.name,
      obj.code,
    ];
    return candidates
      .flatMap((v) =>
        typeof v === "string" || typeof v === "number" ? [String(v)] : []
      )
      .filter(Boolean);
  }

  return [];
}

/**
 * Extract system reference strings from a registry entry.
 * This is intentionally defensive: the registry may encode references under different fields.
 *
 * @param {any} entry
 * @returns {string[]}
 */
function extractSystemRefsFromRule(entry) {
  if (!entry || typeof entry !== "object") return [];

  // Common field names we may encounter over time. We DO NOT require all of these to exist.
  const fields = [
    "systems",
    "systemIds",
    "system_ids",
    "systemNames",
    "system_names",
    "appliesToSystems",
    "applies_to_systems",
    "targets",
    "targetSystems",
  ];

  const refs = fields.flatMap((k) => normalizeRefs(entry[k]));
  return Array.from(new Set(refs));
}

/**
 * Decide whether a given rule registry entry references the given system.
 *
 * @param {any} entry
 * @param {any} system
 * @returns {boolean}
 */
function ruleReferencesSystem(entry, system) {
  if (!entry || !system) return false;

  const systemId = system?.system_id ?? system?.systemId ?? system?.id;
  const systemName = system?.system_name ?? system?.systemName ?? system?.name;

  const systemKeys = [systemId, systemName]
    .filter((v) => v !== undefined && v !== null && String(v).trim().length > 0)
    .map((v) => String(v));

  if (systemKeys.length === 0) return false;

  const systemKeysLower = new Set(systemKeys.map((s) => s.toLowerCase()));
  const refs = extractSystemRefsFromRule(entry);

  // Metadata-only wildcard support:
  // If the registry entry declares "*" (or a common equivalent) as a target, it is treated
  // as "applies to all systems" for Rule Trace display purposes.
  const refsLower = new Set(refs.map((r) => String(r).toLowerCase()));
  if (
    refsLower.has("*") ||
    refsLower.has("all") ||
    refsLower.has("all_systems") ||
    refsLower.has("all-systems")
  ) {
    return true;
  }

  for (const ref of refs) {
    const r = String(ref).toLowerCase();
    if (systemKeysLower.has(r)) return true;
  }
  return false;
}

/**
 * Deterministic string comparator that does NOT depend on locale.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number}
 */
function compareStringsDeterministic(a, b) {
  const sa = String(a ?? "");
  const sb = String(b ?? "");
  if (sa === sb) return 0;
  return sa < sb ? -1 : 1;
}

/**
 * Deterministic comparator for rule metadata entries.
 *
 * Tie-breakers are explicit so ordering is deterministic even if the JS engine's
 * `.sort()` is not stable.
 *
 * @param {any} a
 * @param {any} b
 * @param {Map<any, number>} registryIndexByIdentity
 * @returns {number}
 */
function compareRuleMetadataDeterministic(a, b, registryIndexByIdentity) {
  // Primary: ruleCode
  let c = compareStringsDeterministic(a?.ruleCode, b?.ruleCode);
  if (c !== 0) return c;

  // Secondary keys (explicit tie-breakers)
  c = compareStringsDeterministic(a?.domain, b?.domain);
  if (c !== 0) return c;

  c = compareStringsDeterministic(
    a?.introducedInPolicyVersion,
    b?.introducedInPolicyVersion
  );
  if (c !== 0) return c;

  c = compareStringsDeterministic(a?.documentReference, b?.documentReference);
  if (c !== 0) return c;

  c = compareStringsDeterministic(a?.description, b?.description);
  if (c !== 0) return c;

  // Final tie-breaker: authoritative registry order (unique by identity).
  const ia = registryIndexByIdentity.get(a);
  const ib = registryIndexByIdentity.get(b);
  const fa = typeof ia === "number" ? ia : Number.MAX_SAFE_INTEGER;
  const fb = typeof ib === "number" ? ib : Number.MAX_SAFE_INTEGER;
  if (fa === fb) return 0;
  return fa < fb ? -1 : 1;
}

/**
 * PUBLIC_INTERFACE
 * Get rule metadata entries that reference a given system.
 *
 * Deterministic ordering:
 * - ruleCode, then domain, then introducedInPolicyVersion, then documentReference, then description,
 *   then registry order as a final tie-breaker.
 *
 * Strict purity:
 * - No module-level caches/memoization; output depends only on inputs and the frozen registry list.
 * - Does not mutate the registry or system objects.
 * - No backend/API calls.
 *
 * @param {object|null|undefined} system - System object (as returned by `/systems`).
 * @returns {readonly any[]} Readonly (frozen) array of rule metadata entries referencing the system.
 */
export function getRulesForSystem(system) {
  if (!system) return Object.freeze([]);

  // Note: listRuleMetadata() returns a frozen list in authoritative order.
  const registry = listRuleMetadata();

  // Build an identity->index map locally (no module state) to enable a deterministic final tie-breaker.
  /** @type {Map<any, number>} */
  const registryIndexByIdentity = new Map();
  for (let i = 0; i < registry.length; i += 1) {
    registryIndexByIdentity.set(registry[i], i);
  }

  const rules = registry
    .filter((entry) => ruleReferencesSystem(entry, system))
    .slice()
    .sort((a, b) =>
      compareRuleMetadataDeterministic(a, b, registryIndexByIdentity)
    );

  return Object.freeze(rules);
}
