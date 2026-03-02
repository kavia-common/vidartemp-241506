/**
 * Rule selectors (frontend-only).
 *
 * IMPORTANT:
 * - Metadata-only: selectors must not execute rules, score, or mutate the registry.
 * - Deterministic: results must be stably ordered.
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
      .flatMap((v) => (typeof v === "string" || typeof v === "number" ? [String(v)] : []))
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

  for (const ref of refs) {
    const r = String(ref).toLowerCase();
    if (systemKeysLower.has(r)) return true;
  }
  return false;
}

/**
 * Memoization cache:
 * - Keyed by system_id if available, else system_name, else object reference fallback.
 * - Safe for frontend usage; does not mutate registry; cache only affects performance.
 */
const _memo = new Map();

/**
 * PUBLIC_INTERFACE
 * Get rule metadata entries that reference a given system.
 *
 * Deterministic ordering:
 * - Alphabetical by ruleCode (fallback: empty string).
 *
 * Purity:
 * - Does not mutate the registry or system objects.
 * - No backend/API calls.
 *
 * @param {object|null|undefined} system - System object (as returned by `/systems`).
 * @returns {readonly any[]} Readonly array of rule metadata entries referencing the system.
 */
export function getRulesForSystem(system) {
  if (!system) return Object.freeze([]);

  const systemId = system?.system_id ?? system?.systemId ?? system?.id;
  const systemName = system?.system_name ?? system?.systemName ?? system?.name;
  const key =
    (systemId !== undefined && systemId !== null && String(systemId).length > 0
      ? `id:${String(systemId)}`
      : systemName
        ? `name:${String(systemName)}`
        : `ref:${String(Object.prototype.toString.call(system))}`) ?? "unknown";

  const cached = _memo.get(key);
  if (cached) return cached;

  const rules = listRuleMetadata()
    .filter((entry) => ruleReferencesSystem(entry, system))
    .slice()
    .sort((a, b) => String(a?.ruleCode ?? "").localeCompare(String(b?.ruleCode ?? "")));

  const frozen = Object.freeze(rules);
  _memo.set(key, frozen);
  return frozen;
}
