import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Server, ChevronRight, RefreshCw, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Package, Layers, ChevronLeft
} from "lucide-react";
import api from "../api/client";
import SovereigntyBadge from "../components/SovereigntyBadge";
import { getRiskProfileForSystem } from "../lib/getRiskProfileForSystem";

/* ── small helpers ── */
const OutcomeBadge = ({ outcome }) => {
  const map = {
    DENY:  "bg-red-500/15 text-red-300 border-red-500/30",
    FLAG:  "bg-amber-500/15 text-amber-300 border-amber-500/30",
    ALLOW: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-mono font-semibold
      ${map[outcome] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
      {outcome}
    </span>
  );
};

const Spinner = () => (
  <RefreshCw size={14} className="animate-spin text-slate-500" />
);

const Err = ({ msg }) => (
  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 my-2">
    <AlertTriangle size={13} /> {msg}
  </div>
);

const EmptyRow = ({ cols, label }) => (
  <tr><td colSpan={cols} className="py-6 text-center text-slate-600 text-xs">{label}</td></tr>
);

/* ────────────────────────────────────────────────────────────
   Tab: Risk Summary
──────────────────────────────────────────────────────────── */
function RiskTab({ systemId }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setD(null); setLoading(true); setError(null);
    api.get(`/systems/${systemId}/risk-summary`)
      .then(r => setD(r.data))
      .catch(e => setError(e?.response?.data?.detail?.message ?? e.message))
      .finally(() => setLoading(false));
  }, [systemId]);

  if (loading) return <div className="p-4"><Spinner /></div>;
  if (error)   return <div className="p-4"><Err msg={error} /></div>;
  if (!d)      return null;

  const StatRow = ({ label, value, accent }) => {
    const c = { red: "text-red-300", amber: "text-amber-300", emerald: "text-emerald-300", slate: "text-slate-200" };
    return (
      <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-sm font-mono font-semibold tabular-nums ${c[accent] ?? c.slate}`}>{value}</span>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* All-time */}
      <div className="bg-[#0d0d14] border border-slate-800 rounded-lg p-4">
        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">All Time</p>
        <StatRow label="Total Evaluations"   value={d.total_evaluations}         accent="slate" />
        <StatRow label="Allow"               value={d.total_allow}               accent="emerald" />
        <StatRow label="Flag"                value={d.total_flag}                accent="amber" />
        <StatRow label="Deny"                value={d.total_deny}                accent="red" />
        <StatRow label="Critical Violations" value={d.total_critical_violations} accent="red" />
        <StatRow label="Warning Violations"  value={d.total_warning_violations}  accent="amber" />
        <StatRow
          label="Most Violated Rule"
          value={d.most_violated_rule_code ?? "—"}
          accent={d.most_violated_rule_code ? "amber" : "slate"}
        />
      </div>

      {/* 7-day windows */}
      <div className="grid grid-cols-2 gap-3">
        {[ [d.last_7_days, "Last 7 Days"], [d.previous_7_days, "Prev 7 Days"] ].map(([w, title]) => (
          <div key={title} className="bg-[#0d0d14] border border-slate-800 rounded-lg p-4">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">{title}</p>
            <StatRow label="Evaluations" value={w.evaluations} accent="slate" />
            <StatRow label="Deny"        value={w.deny}        accent="red" />
            <StatRow label="Flag"        value={w.flag}        accent="amber" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Tab: Dependency Map
──────────────────────────────────────────────────────────── */
function DependencyTab({ systemId }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setD(null); setLoading(true); setError(null);
    api.get(`/systems/${systemId}/dependency-map`)
      .then(r => setD(r.data))
      .catch(e => setError(e?.response?.data?.detail?.message ?? e.message))
      .finally(() => setLoading(false));
  }, [systemId]);

  if (loading) return <div className="p-4"><Spinner /></div>;
  if (error)   return <div className="p-4"><Err msg={error} /></div>;
  if (!d)      return null;

  return (
    <div className="p-4 space-y-5">
      {/* Interfaces */}
      <div className="grid grid-cols-2 gap-3">
        {/* Upstream */}
        <div className="bg-[#0d0d14] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight size={13} className="text-indigo-400" />
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Upstream ({d.interfaces.upstream.length})</p>
          </div>
          {d.interfaces.upstream.length === 0
            ? <p className="text-xs text-slate-600">No upstream interfaces</p>
            : d.interfaces.upstream.map(s => (
                <div key={s.system_id} className="flex items-center justify-between py-1.5 border-b border-slate-800/40 last:border-0">
                  <span className="text-xs text-slate-300 font-mono truncate max-w-[120px]">{s.system_name}</span>
                  <SovereigntyBadge level={s.sovereignty_level} />
                </div>
              ))
          }
        </div>

        {/* Downstream */}
        <div className="bg-[#0d0d14] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownRight size={13} className="text-slate-400" />
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Downstream ({d.interfaces.downstream.length})</p>
          </div>
          {d.interfaces.downstream.length === 0
            ? <p className="text-xs text-slate-600">No downstream interfaces</p>
            : d.interfaces.downstream.map(s => (
                <div key={s.system_id} className="flex items-center justify-between py-1.5 border-b border-slate-800/40 last:border-0">
                  <span className="text-xs text-slate-300 font-mono truncate max-w-[120px]">{s.system_name}</span>
                  <SovereigntyBadge level={s.sovereignty_level} />
                </div>
              ))
          }
        </div>
      </div>

      {/* Components */}
      <div className="bg-[#0d0d14] border border-slate-800 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
          <Layers size={13} className="text-slate-500" />
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Active Components ({d.components.length})</p>
        </div>
        {d.components.length === 0
          ? <p className="px-4 py-5 text-xs text-slate-600">No active components</p>
          : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-mono text-[10px] uppercase tracking-wide">
                  <th className="text-left px-4 py-2">Component</th>
                  <th className="text-left px-4 py-2">Sovereignty</th>
                  <th className="text-left px-4 py-2">Product</th>
                  <th className="text-left px-4 py-2">Vendor</th>
                  <th className="text-left px-4 py-2">Product Sov.</th>
                  <th className="text-left px-4 py-2">Zero Cloud</th>
                </tr>
              </thead>
              <tbody>
                {d.components.map(c => (
                  <tr key={c.component_id} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-2.5 text-slate-200 font-mono">{c.component_name}</td>
                    <td className="px-4 py-2.5"><SovereigntyBadge level={c.sovereignty_level} /></td>
                    {c.product ? (
                      <>
                        <td className="px-4 py-2.5 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Package size={11} className="text-indigo-400" />
                            {c.product.canonical_name}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">{c.product.vendor_name} <span className="text-slate-600">({c.product.vendor_country})</span></td>
                        <td className="px-4 py-2.5"><SovereigntyBadge level={c.product.sovereignty_level} /></td>
                        <td className="px-4 py-2.5">
                          <span className={c.product.zero_cloud_capable
                            ? "text-emerald-400"
                            : "text-red-400"}>
                            {c.product.zero_cloud_capable ? "Yes" : "No"}
                          </span>
                        </td>
                      </>
                    ) : (
                      <td colSpan={4} className="px-4 py-2.5 text-slate-600 italic">No product linked</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Tab: Recent Evaluations
──────────────────────────────────────────────────────────── */
function EvaluationsTab({ systemId }) {
  const PAGE_SIZE = 10;
  const [page,    setPage]    = useState(1);
  const [d,       setD]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setD(null); setLoading(true); setError(null);
    api.get(`/systems/${systemId}/evaluation-history`, {
      params: { page, page_size: PAGE_SIZE },
    })
      .then(r => setD(r.data))
      .catch(e => setError(e?.response?.data?.detail?.message ?? e.message))
      .finally(() => setLoading(false));
  }, [systemId, page]);

  // reset page when system changes
  useEffect(() => { setPage(1); }, [systemId]);

  if (loading) return <div className="p-4"><Spinner /></div>;
  if (error)   return <div className="p-4"><Err msg={error} /></div>;
  if (!d)      return null;

  const items = d.items ?? [];

  return (
    <div className="p-4">
      <div className="bg-[#0d0d14] border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 font-mono text-[10px] uppercase tracking-wide">
              <th className="text-left px-4 py-2">Triggered</th>
              <th className="text-left px-4 py-2">Event Type</th>
              <th className="text-left px-4 py-2">Outcome</th>
              <th className="text-left px-4 py-2">Violations</th>
              <th className="text-left px-4 py-2">Triggered By</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0
              ? <EmptyRow cols={5} label="No evaluations" />
              : items.map(ev => (
                  <tr key={ev.event_id} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-2.5 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(ev.triggered_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono">{ev.event_type}</td>
                    <td className="px-4 py-2.5"><OutcomeBadge outcome={ev.outcome} /></td>
                    <td className="px-4 py-2.5">
                      {ev.violations?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ev.violations.map((v, i) => (
                            <span key={i}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                              {v.rule_code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono">{ev.triggered_by ?? "—"}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-slate-600 font-mono">
          {d.total} evaluation{d.total !== 1 ? "s" : ""} total
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="text-[11px] text-slate-500 font-mono">page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!d.has_next || loading}
            className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   System Detail Panel
──────────────────────────────────────────────────────────── */
const TABS = [
  { id: "risk",   label: "Risk Summary" },
  { id: "map",    label: "Dependency Map" },
  { id: "evals",  label: "Evaluations" },
];

function SystemDetail({ system, onClose }) {
  const [tab, setTab] = useState("risk");

  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Server size={14} className="text-indigo-400" />
            <span className="text-sm font-semibold text-slate-100 font-mono">{system.system_name}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-slate-600 font-mono">L{system.layer_id}</span>
            <SovereigntyBadge level={system.sovereignty_level} />
            {system.zero_cloud_required && (
              <span className="text-[10px] text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono">ZERO-CLOUD</span>
            )}
            {!system.is_active && (
              <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded font-mono">INACTIVE</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-slate-300 text-xs transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[11px] font-mono uppercase tracking-wide transition-colors border-b-2 ${
              tab === t.id
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "risk"  && <RiskTab        systemId={system.system_id} />}
        {tab === "map"   && <DependencyTab  systemId={system.system_id} />}
        {tab === "evals" && <EvaluationsTab systemId={system.system_id} />}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   System Explorer (root view)
──────────────────────────────────────────────────────────── */
function SeverityCountBadge({ label, value, tone }) {
  const toneMap = {
    slate: "bg-slate-700/30 text-slate-300 border-slate-700",
    red: "bg-red-500/15 text-red-300 border-red-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono tabular-nums ${
        toneMap[tone] ?? toneMap.slate
      }`}
    >
      <span className="uppercase tracking-wide">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function SystemListItem({ system, isSelected, onSelect }) {
  const riskProfile = useMemo(() => getRiskProfileForSystem(system), [system]);

  return (
    <button
      key={system.system_id}
      onClick={() => onSelect(system)}
      className={`w-full text-left px-4 py-3 border-b border-slate-800/50 transition-colors group ${
        isSelected
          ? "bg-indigo-600/10 border-l-2 border-l-indigo-500"
          : "hover:bg-slate-800/40 border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-mono truncate ${
              isSelected ? "text-indigo-200" : "text-slate-300"
            }`}
          >
            {system.system_name}
          </p>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-slate-600 font-mono">L{system.layer_id}</span>
            <SovereigntyBadge level={system.sovereignty_level} />
            {!system.is_active && <span className="text-[10px] text-slate-600">inactive</span>}
          </div>

          {/* Rule Trace (summary) */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-wide">
              Rule Trace
            </span>
            <span className="text-[10px] text-slate-600 font-mono tabular-nums">
              {riskProfile.totalRules} rule{riskProfile.totalRules !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Risk Profile (metadata-derived only) */}
          <div className="mt-2">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-wide">
              Risk Profile
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <SeverityCountBadge label="Total" value={riskProfile.totalRules} tone="slate" />
              <SeverityCountBadge label="Critical" value={riskProfile.criticalCount} tone="red" />
              <SeverityCountBadge label="Warning" value={riskProfile.warningCount} tone="amber" />
              <SeverityCountBadge label="Info" value={riskProfile.infoCount} tone="blue" />
            </div>
          </div>
        </div>

        <ChevronRight
          size={13}
          className={`flex-shrink-0 mt-0.5 transition-colors ${
            isSelected ? "text-indigo-400" : "text-slate-700 group-hover:text-slate-500"
          }`}
        />
      </div>
    </button>
  );
}

export default function SystemExplorer() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/systems");
      setSystems(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail?.message ?? e.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex h-full">
      {/* System list */}
      <div className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-slate-100">Systems</h1>
          <button
            onClick={load}
            disabled={loading}
            className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && (
          <div className="p-3">
            <Err msg={error} />
          </div>
        )}
        {loading && !systems.length && (
          <div className="p-4 text-xs text-slate-600 animate-pulse">Loading systems…</div>
        )}

        <div className="flex-1 overflow-y-auto">
          {systems.map((s) => (
            <SystemListItem
              key={s.system_id}
              system={s}
              isSelected={selected?.system_id === s.system_id}
              onSelect={setSelected}
            />
          ))}
          {!loading && systems.length === 0 && (
            <p className="px-4 py-6 text-xs text-slate-600 text-center">No systems registered</p>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-800">
          <p className="text-[10px] text-slate-700 font-mono">
            {systems.length} system{systems.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {selected ? (
          <SystemDetail system={selected} onClose={() => setSelected(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Server size={32} className="text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">Select a system to inspect</p>
            <p className="text-xs text-slate-700 mt-1">Risk summary · Dependency map · Evaluations</p>
          </div>
        )}
      </div>
    </div>
  );
}
