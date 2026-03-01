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

function asBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : v == null ? undefined : Boolean(v);
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function asSovereigntyLevel(v: unknown): SovereigntyLevel | undefined {
  const s = asString(v)?.toUpperCase();
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
  const advisoryRuleCodes =
    Array.isArray(advisoryRuleCodesRaw) ? advisoryRuleCodesRaw.map(asString).filter(Boolean) as string[] : undefined;

  return {
    productId: asString(raw.productId ?? raw.product_id),
    canonicalName: asString(raw.canonicalName ?? raw.canonical_name),
    vendorName: asString(raw.vendorName ?? raw.vendor_name),
    vendorCountry: asString(raw.vendorCountry ?? raw.vendor_country),
    sovereigntyLevel: asSovereigntyLevel(raw.sovereigntyLevel ?? raw.sovereignty_level),
    zeroCloudCapable: typeof raw.zeroCloudCapable === "boolean"
      ? raw.zeroCloudCapable
      : typeof raw.zero_cloud_capable === "boolean"
        ? (raw.zero_cloud_capable as boolean)
        : undefined,
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
  const system = normalizeSystem(payload);

  const downstreamRaw = isObject(payload) ? (payload.downstreamSystemIds ?? payload.downstream_system_ids) : undefined;
  const downstreamSystemIds = Array.isArray(downstreamRaw)
    ? (downstreamRaw.map(asString).filter(Boolean) as string[])
    : undefined;

  const input: GovernanceEvaluationInput = { system, downstreamSystemIds };
  return runDeterministicGovernanceEngine(input);
}
