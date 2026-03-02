import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Shield } from "lucide-react";
import api from "../api/client";

/**
 * GovernanceTraceView
 *
 * Minimal view to support the `/governance-trace` route.
 * The backend endpoint for governance trace events may vary by deployment,
 * so this component is defensive: it tries a reasonable endpoint and shows
 * a helpful empty state if none is available.
 */
export default function GovernanceTraceView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);

  const endpoint = useMemo(() => "/governance/trace", []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(endpoint);
      const items = res?.data?.items ?? res?.data ?? [];
      setEvents(Array.isArray(items) ? items : []);
    } catch (e) {
      setError(e?.response?.data?.detail?.message ?? e?.message ?? "Request failed");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Governance Trace</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Event timeline and trace details for governance-related activity.
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
        <div className="text-slate-500 text-sm animate-pulse">Loading trace events…</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="bg-[#111118] border border-slate-800 rounded-lg p-6 text-center">
          <Shield size={28} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No trace events available.</p>
          <p className="text-xs text-slate-600 mt-1">
            Expected endpoint: <span className="font-mono">{endpoint}</span>
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="bg-[#0d0d14] border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Events ({events.length})
            </p>
          </div>
          <div className="divide-y divide-slate-800/50">
            {events.map((ev, idx) => {
              const ts = ev?.timestamp ?? ev?.created_at ?? ev?.occurred_at;
              const title = ev?.event_type ?? ev?.type ?? "event";
              const id = ev?.event_id ?? ev?.id ?? idx;

              return (
                <div key={id} className="px-4 py-3 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-slate-200 truncate">{title}</p>
                      {ev?.message && (
                        <p className="text-xs text-slate-500 mt-1">{String(ev.message)}</p>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 font-mono whitespace-nowrap">
                      {ts ? new Date(ts).toLocaleString() : "—"}
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
