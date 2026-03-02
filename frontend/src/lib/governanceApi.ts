import type { AxiosResponse } from "axios";
import api from "@/api/client";
import type {
  ApiAmendmentDetail,
  ApiAmendmentState,
  ApiAmendmentsListResponse,
  ApiEstateHealthResponse,
  ApiImpactSimulationResponse,
  ApiSystemDependencyMap,
  ApiSystemRiskSummary,
  ApiSystemSummary,
  ApiEvaluationHistoryResponse,
} from "@/types/api";

/**
 * Small helper to unwrap Axios responses without altering runtime logic.
 */
function unwrap<T>(res: AxiosResponse<T>): T {
  return res.data;
}

/**
 * PUBLIC_INTERFACE
 * Fetch estate health metrics used by the EstateOverview view.
 */
export async function fetchEstateHealth(): Promise<ApiEstateHealthResponse> {
  return api.get<ApiEstateHealthResponse>("/governance/estate-health").then(unwrap);
}

/**
 * PUBLIC_INTERFACE
 * Fetch all systems used by the SystemExplorer list.
 */
export async function fetchSystems(): Promise<ApiSystemSummary[]> {
  return api.get<ApiSystemSummary[]>("/systems").then(unwrap);
}

/**
 * PUBLIC_INTERFACE
 * Fetch risk summary for a system (SystemExplorer → Risk Summary tab).
 */
export async function fetchSystemRiskSummary(systemId: string): Promise<ApiSystemRiskSummary> {
  return api.get<ApiSystemRiskSummary>(`/systems/${systemId}/risk-summary`).then(unwrap);
}

/**
 * PUBLIC_INTERFACE
 * Fetch dependency map for a system (SystemExplorer → Dependency Map tab).
 */
export async function fetchSystemDependencyMap(systemId: string): Promise<ApiSystemDependencyMap> {
  return api.get<ApiSystemDependencyMap>(`/systems/${systemId}/dependency-map`).then(unwrap);
}

/**
 * PUBLIC_INTERFACE
 * Fetch evaluation history for a system (SystemExplorer → Evaluations tab).
 */
export async function fetchSystemEvaluationHistory(params: {
  systemId: string;
  page: number;
  page_size: number;
}): Promise<ApiEvaluationHistoryResponse> {
  const { systemId, ...query } = params;
  return api
    .get<ApiEvaluationHistoryResponse>(`/systems/${systemId}/evaluation-history`, {
      params: query,
    })
    .then(unwrap);
}

/**
 * PUBLIC_INTERFACE
 * Fetch paginated amendments list (AmendmentConsole left panel).
 */
export async function fetchAmendments(params: {
  page: number;
  page_size: number;
  state?: ApiAmendmentState;
}): Promise<ApiAmendmentsListResponse> {
  return api.get<ApiAmendmentsListResponse>("/amendments", { params }).then(unwrap);
}

/**
 * PUBLIC_INTERFACE
 * Fetch amendment details (AmendmentConsole right panel).
 */
export async function fetchAmendmentDetail(amendmentId: string): Promise<ApiAmendmentDetail> {
  return api.get<ApiAmendmentDetail>(`/amendments/${amendmentId}`).then(unwrap);
}

/**
 * PUBLIC_INTERFACE
 * Run impact simulation for an amendment (AmendmentConsole → Simulation panel).
 */
export async function simulateAmendment(amendmentId: string): Promise<ApiImpactSimulationResponse> {
  return api
    .post<ApiImpactSimulationResponse>(`/amendments/${amendmentId}/simulate`)
    .then(unwrap);
}
