import { runDeterministicGovernanceEngine } from "./engine/core";
import type {
  Component,
  GovernanceEvaluationInput,
  GovernanceEvaluationResult,
  GovernanceSystem,
  Product,
  SovereigntyLevel,
} from "./engine/types";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : v == null ? undefined : String(v);
}

/**
 * Strict boolean parsing (no Boolean(value) casting):
 * - true → true
 * - false → false
 * - "true"/"false" (case-insensitive, trimmed) → true/false
 * - 1 → true
 * - 0 → false
 * - otherwise → undefined
 */
function asBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;

  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
    return undefined;
  }

  if (typeof v === "number") {
    if (v === 1) return true;
    if (v === 0) return false;
    return undefined;
  }

  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function asSovereigntyLevel(v: unknown): SovereigntyLevel | undefined {
  // Normalize strings defensively: trim before uppercasing.
  const s = asString(v)?.trim().toUpperCase();
  switch (s) {
    case "SOVEREIGN":
    case "APPROVED":
    case "CONDITIONAL":
    case "RESTRICTED":
    case "PROHIBITED":
      return s as SovereigntyLevel;
    default:
      return undefined;
  }
}

function normalizeProduct(raw: unknown): Product | null {
  if (!isObject(raw)) return null;

  const advisoryRuleCodesRaw = raw.advisoryRuleCodes ?? raw.advisory_rule_codes;

  // Normalize advisoryRuleCodes:
  // - array → array of strings
  // - single string → [string]
  // - otherwise → undefined
  let advisoryRuleCodes: string[] | undefined;
  if (Array.isArray(advisoryRuleCodesRaw)) {
    advisoryRuleCodes = advisoryRuleCodesRaw.map(asString).filter(Boolean) as string[];
  } else if (typeof advisoryRuleCodesRaw === "string") {
    const code = advisoryRuleCodesRaw.trim();
    advisoryRuleCodes = code ? [code] : undefined;
  }

  // zeroCloudCapable normalization:
  // allow booleans, 0/1, and "true"/"false" strings.
  const zeroCloudCapableRaw = raw.zeroCloudCapable ?? raw.zero_cloud_capable;
  const zeroCloudCapable = asBool(zeroCloudCapableRaw);

  return {
    productId: asString(raw.productId ?? raw.product_id),
    canonicalName: asString(raw.canonicalName ?? raw.canonical_name),
    vendorName: asString(raw.vendorName ?? raw.vendor_name),
    vendorCountry: asString(raw.vendorCountry ?? raw.vendor_country),
    sovereigntyLevel: asSovereigntyLevel(raw.sovereigntyLevel ?? raw.sovereignty_level),
    zeroCloudCapable,
    advisoryRuleCodes,
  };
}

function normalizeComponent(raw: unknown): Component | null {
  if (!isObject(raw)) return null;

  const product = normalizeProduct(raw.product);

  return {
    componentId: asString(raw.componentId ?? raw.component_id),
    componentName: asString(raw.componentName ?? raw.component_name),
    sovereigntyLevel: asSovereigntyLevel(raw.sovereigntyLevel ?? raw.sovereignty_level),
    product,
  };
}

function normalizeSystem(raw: unknown): GovernanceSystem {
  // Defensive defaults; this ensures analyzer never throws on missing fields.
  if (!isObject(raw)) return {};

  const componentsRaw = raw.components ?? raw.active_components ?? raw.component_list;
  const components = Array.isArray(componentsRaw)
    ? (componentsRaw.map(normalizeComponent).filter(Boolean) as Component[])
    : undefined;

  return {
    systemId: asString(raw.systemId ?? raw.system_id),
    systemName: asString(raw.systemName ?? raw.system_name),
    layerId: asNumber(raw.layerId ?? raw.layer_id),
    sovereigntyLevel: asSovereigntyLevel(raw.sovereigntyLevel ?? raw.sovereignty_level),
    zeroCloudRequired: asBool(raw.zeroCloudRequired ?? raw.zero_cloud_required),
    isActive: asBool(raw.isActive ?? raw.is_active),
    components,
  };
}

/**
 * Analyzer entrypoint: normalize an arbitrary payload into the engine input model
 * and run the deterministic governance engine.
 *
 * This module intentionally does not perform any network calls and can be used
 * in both UI and non-UI logic layers.
 */
// PUBLIC_INTERFACE
export function analyzeGovernance(payload: unknown): GovernanceEvaluationResult {
  // Support wrapped payloads:
  // If payload.system exists, treat that as the system root.
  const payloadHasSystemWrapper =
    isObject(payload) && Object.prototype.hasOwnProperty.call(payload, "system");
  const systemRoot = payloadHasSystemWrapper ? (payload as Record<string, unknown>).system : payload;

  const system = normalizeSystem(systemRoot);

  const downstreamRaw = isObject(payload) ? (payload.downstreamSystemIds ?? payload.downstream_system_ids) : undefined;
  const downstreamSystemIds = Array.isArray(downstreamRaw)
    ? (downstreamRaw.map(asString).filter(Boolean) as string[])
    : undefined;

  const input: GovernanceEvaluationInput = { system, downstreamSystemIds };
  const result = runDeterministicGovernanceEngine(input);

  // Defensive safeguard:
  // If after normalization system.sovereigntyLevel and components are both undefined,
  // attach a deterministic structured warning note (no console output).
  if (system.sovereigntyLevel === undefined && system.components === undefined) {
    (result as unknown as Record<string, unknown>).normalizationWarnings = [
      {
        code: "ANALYZER_NORMALIZATION_MISSING_SYSTEM_CONTEXT",
        message:
          "Analyzer normalization produced a system with neither sovereigntyLevel nor components; upstream payload may be mis-shaped.",
        details: {
          payloadWrappedSystem: payloadHasSystemWrapper,
          systemId: system.systemId,
          systemName: system.systemName,
        },
      },
    ];
  }

  // Contract-shape hardening: always return normalizationWarnings as an array.
  const resultRecord = result as unknown as Record<string, unknown>;
  if (!Array.isArray(resultRecord.normalizationWarnings)) {
    resultRecord.normalizationWarnings = [];
  }

  return result;
}
