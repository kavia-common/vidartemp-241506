import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Shield } from "lucide-react";
import api from "../api/client";

/**
 * GovernanceTraceView
 *
 * Displays evaluation history from the backend /api/evaluation endpoint.
 * This view consumes backend evaluation results and does not perform any
 * frontend evaluation logic.
 */
export default function GovernanceTraceView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [page] = useState(1);
  const [pageSize] = useState(50);

  const endpoint = useMemo(() => "/api/evaluation", []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(endpoint, {
        params: { page, page_size: pageSize },
      });
      
      // Handle paginated response format
      const items = res?.data?.items ?? res?.data ?? [];
      setEvents(Array.isArray(items) ? items : []);
    } catch (e) {
      setError(e?.response?.data?.detail?.message ?? e?.message ?? "Request failed");
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
            {events.map((ev, idx) => {
              const eventId = ev?.event_id ?? ev?.id ?? idx;
              const triggeredAt = ev?.triggered_at ?? ev?.timestamp ?? ev?.created_at ?? ev?.occurred_at;
              const eventType = ev?.event_type ?? ev?.type ?? "evaluation";
              const outcome = ev?.outcome ?? "UNKNOWN";
              const triggeredBy = ev?.triggered_by ?? "—";
              const violations = ev?.violations ?? [];
              const violationCount = Array.isArray(violations) ? violations.length : 0;

              // Color code outcome
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
                        <span className={`text-xs font-semibold ${outcomeColor}`}>
                          {outcome}
                        </span>
                        {violationCount > 0 && (
                          <span className="text-[10px] text-slate-500">
                            {violationCount} violation{violationCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600">
                        <span>Event: {String(eventId).substring(0, 8)}</span>
                        <span>By: {triggeredBy}</span>
                      </div>
                      {violations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {violations.slice(0, 5).map((v, vIdx) => (
                            <span
                              key={vIdx}
                              className="text-[9px] px-1.5 py-0.5 bg-slate-800/50 border border-slate-700 rounded font-mono text-slate-400"
                            >
                              {v?.rule_code ?? "UNKNOWN"}
                            </span>
                          ))}
                          {violations.length > 5 && (
                            <span className="text-[9px] text-slate-600">
                              +{violations.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 font-mono whitespace-nowrap">
                      {triggeredAt ? new Date(triggeredAt).toLocaleString() : "—"}
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
