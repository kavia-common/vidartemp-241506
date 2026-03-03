/**
 * Strict Vidar Governance API typings.
 *
 * These interfaces are intentionally minimal and reflect only the fields that are
 * actually consumed by the frontend UI (src/views) and typed lib utilities.
 *
 * Notes:
 * - Field names are snake_case to match the backend responses currently consumed in JSX views.
 * - Optional fields are marked optional/nullable only when the UI handles them as such.
 */

import type { Outcome, Severity, SovereigntyLevel } from "@/engine/types";

/** ISO datetime string as returned by the backend. */
export type ApiIsoDateTime = string;

/** Generic snake_case paginated response shape used by several list endpoints. */
export interface ApiPaginatedResponse<TItem> {
  items: TItem[];
  total: number;
  has_next: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Estate Health
 * ───────────────────────────────────────────────────────────────────────────── */

export interface ApiEstateHealthResponse {
  total_systems: number;
  active_systems: number;
  inactive_systems: number;

  total_evaluations_last_30_days: number;
  systems_with_deny_last_30_days: number;
  systems_with_flag_last_30_days: number;

  total_critical_violations_last_30_days: number;
  total_warning_violations_last_30_days: number;

  systems_with_product_advisory_violations: number;
  systems_with_sovereignty_advisory_violations: number;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Systems
 * ───────────────────────────────────────────────────────────────────────────── */

export interface ApiSystemSummary {
  system_id: string;
  system_name: string;
  layer_id: number;
  sovereignty_level: SovereigntyLevel;
  is_active: boolean;
  zero_cloud_required: boolean;
}

export interface ApiSystemRiskWindow {
  evaluations: number;
  deny: number;
  flag: number;
}

export interface ApiSystemRiskSummary {
  total_evaluations: number;
  total_allow: number;
  total_flag: number;
  total_deny: number;

  total_critical_violations: number;
  total_warning_violations: number;

  most_violated_rule_code?: string | null;

  last_7_days: ApiSystemRiskWindow;
  previous_7_days: ApiSystemRiskWindow;
}

export interface ApiDependencyMapInterfaceSystem {
  system_id: string;
  system_name: string;
  sovereignty_level: SovereigntyLevel;
}

export interface ApiDependencyMapInterfaces {
  upstream: ApiDependencyMapInterfaceSystem[];
  downstream: ApiDependencyMapInterfaceSystem[];
}

export interface ApiDependencyMapProduct {
  canonical_name: string;
  vendor_name: string;
  vendor_country: string;
  sovereignty_level: SovereigntyLevel;
  zero_cloud_capable: boolean;
}

export interface ApiDependencyMapComponent {
  component_id: string;
  component_name: string;
  sovereignty_level: SovereigntyLevel;

  // The UI treats missing product as falsy and renders a "No product linked" row.
  product?: ApiDependencyMapProduct | null;
}

export interface ApiSystemDependencyMap {
  interfaces: ApiDependencyMapInterfaces;
  components: ApiDependencyMapComponent[];
}

/**
 * Evaluation history (backend evaluation events).
 *
 * Strictly modeled to match only what GovernanceTraceView consumes.
 */
export interface ApiEvaluationEvent {
  event_id: string;
  triggered_at: ApiIsoDateTime;
  event_type: string;
  outcome: Outcome;

  target_system_id: string;
  critical_count: number;
  warning_count: number;
  informational_count: number;

  triggered_by: string;
  rules_snapshot_hash: string;
}

export type ApiEvaluationHistoryResponse = ApiPaginatedResponse<ApiEvaluationEvent>;

/* ─────────────────────────────────────────────────────────────────────────────
 * Amendments
 * ───────────────────────────────────────────────────────────────────────────── */

export type ApiAmendmentState =
  | "PROPOSED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "EXECUTED"
  | "REJECTED"
  | "WITHDRAWN";

export type ApiAmendmentType =
  | "SUBSTITUTION"
  | "MODIFICATION"
  | "DECOMMISSION"
  | "ADDITION";

export interface ApiAmendmentListItem {
  amendment_id: string;
  amendment_code: string;
  current_state: ApiAmendmentState;
  amendment_type: ApiAmendmentType;

  proposed_by: string;
  proposed_at: ApiIsoDateTime;

  latest_transition_at?: ApiIsoDateTime | null;
}

export type ApiAmendmentsListResponse = ApiPaginatedResponse<ApiAmendmentListItem>;

export interface ApiAmendmentConsumption {
  consumed_at: ApiIsoDateTime;
  consumed_by_op: string;
  consuming_entity_id: string;
  consuming_entity_type: string;
  notes?: string | null;
}

export interface ApiAmendmentTransition {
  transition_id?: string | null;

  from_state?: ApiAmendmentState | null;
  to_state: ApiAmendmentState;

  transitioned_at: ApiIsoDateTime;
  transitioned_by: string;

  notes?: string | null;
}

export interface ApiAmendmentDetail {
  amendment_id: string;
  amendment_code: string;
  current_state: ApiAmendmentState;
  amendment_type: ApiAmendmentType;

  description: string;
  target_system_id: string;

  proposed_by: string;
  proposed_at: ApiIsoDateTime;

  resolved_by?: string | null;
  resolved_at?: ApiIsoDateTime | null;

  is_consumed: boolean;
  consumption?: ApiAmendmentConsumption | null;

  transitions?: ApiAmendmentTransition[] | null;
}

export interface ApiImpactSimulationPredictedViolation {
  severity: Severity;
  rule_code: string;
  message: string;
}

export interface ApiImpactSimulationRiskDelta {
  current_outcome?: Outcome | null;
  outcome_changed: boolean;
  critical_delta: number;
  warning_delta: number;
}

export interface ApiImpactSimulationResponse {
  simulated_event_type: string;

  predicted_outcome: Outcome;
  risk_delta: ApiImpactSimulationRiskDelta;

  predicted_violations: ApiImpactSimulationPredictedViolation[];
  affected_downstream_system_ids: Array<string | number>;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Governance trace
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * The trace endpoint is consumed defensively (multiple possible timestamp/id keys).
 * Model only the keys the UI checks/prints.
 */
export interface ApiGovernanceTraceEvent {
  timestamp?: ApiIsoDateTime | null;
  created_at?: ApiIsoDateTime | null;
  occurred_at?: ApiIsoDateTime | null;

  event_type?: string | null;
  type?: string | null;

  event_id?: string | null;
  id?: string | number | null;

  message?: unknown;
}
