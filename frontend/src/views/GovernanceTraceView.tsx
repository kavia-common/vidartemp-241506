import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Shield } from "lucide-react";
import api from "../api/client";
import type { ApiEvaluationEvent, ApiEvaluationHistoryResponse } from "@/types/api";
import type { Outcome } from "@/engine/types";

/**
 * GovernanceTraceView
 *
 * Displays evaluation history from the backend /api/evaluation-history endpoint.
 * This view consumes backend evaluation results and does not perform any
 * frontend evaluation logic.
 */

// PUBLIC_INTERFACE
function assertEvaluationHistoryResponse(
  data: unknown,
): asserts data is ApiEvaluationHistoryResponse {
  /** Runtime validation to ensure we fail visibly instead of guessing field names. */
  if (!data || typeof data !== "object") {
    throw new Error("Invalid evaluation history response: expected an object.");
  }

  const rec = data as Record<string, unknown>;
  if (!Array.isArray(rec.items)) {
    throw new Error("Invalid evaluation history response: missing 'items' array.");
  }
  if (typeof rec.total !== "number") {
    throw new Error("Invalid evaluation history response: missing numeric 'total'.");
  }
  if (typeof rec.has_next !== "boolean") {
    throw new Error("Invalid evaluation history response: missing boolean 'has_next'.");
  }

  rec.items.forEach((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid evaluation event at items[${idx}]: expected an object.`);
    }
    const ev = item as Record<string, unknown>;

    if (typeof ev.event_id !== "string" || ev.event_id.length === 0) {
      throw new Error(`Invalid evaluation event at items[${idx}]: missing 'event_id'.`);
    }
    if (typeof ev.triggered_at !== "string" || ev.triggered_at.length === 0) {
      throw new Error(`Invalid evaluation event at items[${idx}]: missing 'triggered_at'.`);
    }
    if (typeof ev.event_type !== "string" || ev.event_type.length === 0) {
      throw new Error(`Invalid evaluation event at items[${idx}]: missing 'event_type'.`);
    }
    if (typeof ev.outcome !== "string" || ev.outcome.length === 0) {
      throw new Error(`Invalid evaluation event at items[${idx}]: missing 'outcome'.`);
    }
    if (typeof ev.system_id !== "string" || ev.system_id.length === 0) {
      throw new Error(`Invalid evaluation event at items[${idx}]: missing 'system_id'.`);
    }
    if (typeof ev.system_name !== "string" || ev.system_name.length === 0) {
      throw new Error(`Invalid evaluation event at items[${idx}]: missing 'system_name'.`);
    }
    if (typeof ev.target_system_id !== "string" || ev.target_system_id.length === 0) {
      throw new Error(`Invalid evaluation event at items[${idx}]: missing 'target_system_id'.`);
    }
    if (typeof ev.target_system_name !== "string" || ev.target_system_name.length === 0) {
      throw new Error(`Invalid evaluation event at items[${idx}]: missing 'target_system_name'.`);
    }
    if (!Array.isArray(ev.rule_codes_triggered)) {
      throw new Error(
        `Invalid evaluation event at items[${idx}]: 'rule_codes_triggered' must be an array.`,
      );
    }
    if (typeof ev.critical_count !== "number") {
      throw new Error(
        `Invalid evaluation event at items[${idx}]: 'critical_count' must be a number.`,
      );
    }
    if (typeof ev.warning_count !== "number") {
      throw new Error(
        `Invalid evaluation event at items[${idx}]: 'warning_count' must be a number.`,
      );
    }

    if (
      ev.triggered_by !== undefined &&
      ev.triggered_by !== null &&
      typeof ev.triggered_by !== "string"
    ) {
      throw new Error(
        `Invalid evaluation event at items[${idx}]: 'triggered_by' must be string|null.`,
      );
    }
  });
}

export default function GovernanceTraceView() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ApiEvaluationEvent[]>([]);
  const [page] = useState<number>(1);
  const [pageSize] = useState<number>(50);

  const endpoint = useMemo(() => "/api/evaluation-history", []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiEvaluationHistoryResponse>(endpoint, {
        params: { page, page_size: pageSize },
      });

      // Strict response contract: do not guess alternative shapes.
      assertEvaluationHistoryResponse(res.data);

      setEvents(res.data.items);
    } catch (e: unknown) {
      const anyErr = e as any;
      setError(anyErr?.response?.data?.detail?.message ?? anyErr?.message ?? "Request failed");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Governance Evaluation History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Backend-evaluated governance events and evaluation results.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-4 py-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-slate-500 text-sm animate-pulse">Loading evaluation history…</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="bg-[#111118] border border-slate-800 rounded-lg p-6 text-center">
          <Shield size={28} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No evaluation events available.</p>
          <p className="text-xs text-slate-600 mt-1">
            Expected endpoint: <span className="font-mono">{endpoint}</span>
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="bg-[#0d0d14] border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Evaluation Events ({events.length})
            </p>
          </div>

          <div className="divide-y divide-slate-800/50">
            {events.map((ev) => {
              const eventId = ev.event_id;
              const triggeredAt = ev.triggered_at;
              const eventType = ev.event_type;
              const outcome: Outcome = ev.outcome;
              const systemId = ev.system_id;
              const systemName = ev.system_name;
              const targetSystemName = ev.target_system_name;
              const triggeredBy = ev.triggered_by ?? "—";
              const ruleCodes = ev.rule_codes_triggered ?? [];
              const criticalCount = ev.critical_count ?? 0;
              const warningCount = ev.warning_count ?? 0;

              let outcomeColor = "text-slate-400";
              if (outcome === "ALLOW") outcomeColor = "text-green-400";
              else if (outcome === "FLAG") outcomeColor = "text-yellow-400";
              else if (outcome === "DENY") outcomeColor = "text-red-400";

              return (
                <div key={eventId} className="px-4 py-3 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-xs font-mono text-slate-200">{eventType}</p>
                        <span className={`text-xs font-semibold ${outcomeColor}`}>{outcome}</span>
                        {criticalCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                            {criticalCount} critical
                          </span>
                        )}
                        {warningCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded">
                            {warningCount} warning
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600">
                        <span>Event: {String(eventId).substring(0, 8)}</span>
                        <span>System: {systemName}</span>
                        <span>Target: {targetSystemName}</span>
                        <span>By: {triggeredBy}</span>
                      </div>

                      {ruleCodes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ruleCodes.slice(0, 5).map((code, cIdx) => (
                            <span
                              key={cIdx}
                              className="text-[9px] px-1.5 py-0.5 bg-slate-800/50 border border-slate-700 rounded font-mono text-slate-400"
                            >
                              {code}
                            </span>
                          ))}
                          {ruleCodes.length > 5 && (
                            <span className="text-[9px] text-slate-600">
                              +{ruleCodes.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-600 font-mono whitespace-nowrap">
                      {new Date(triggeredAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
