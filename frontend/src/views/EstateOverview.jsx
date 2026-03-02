import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import api from "../api/client";

function MetricCard({ label, value, sub, accent }) {
  const accentMap = {
    red:    "border-red-500/30 text-red-300",
    amber:  "border-amber-500/30 text-amber-300",
    emerald:"border-emerald-500/30 text-emerald-300",
    indigo: "border-indigo-500/30 text-indigo-300",
    blue:   "border-blue-500/30 text-blue-300",
    slate:  "border-slate-700 text-slate-200",
  };
  const valCls = accentMap[accent] ?? accentMap.slate;
  return (
    <div className="bg-[#111118] border border-slate-800 rounded-lg p-4 flex flex-col gap-1">
      <span className="text-[11px] text-slate-500 uppercase tracking-widest font-mono">{label}</span>
      <span className={`text-3xl font-bold tabular-nums ${valCls.split(" ")[1]}`}>{value}</span>
      {sub && <span className="text-[11px] text-slate-600">{sub}</span>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-3">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {children}
      </div>
    </div>
  );
}

export default function EstateOverview() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [lastAt,  setLastAt]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/governance/estate-health");
      setData(res.data);
      setLastAt(new Date());
    } catch (e) {
      setError(e?.response?.data?.detail?.message ?? e.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Estate Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lastAt ? `Last refreshed ${lastAt.toLocaleTimeString()}` : "Loading…"}
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

      {!data && loading && (
        <div className="text-slate-500 text-sm animate-pulse">Loading estate metrics…</div>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          {/* Systems */}
          <Section title="Systems">
            <MetricCard label="Total Systems"    value={data.total_systems}    accent="slate" />
            <MetricCard label="Active"           value={data.active_systems}   accent="emerald"
              sub={`${data.total_systems ? Math.round(data.active_systems / data.total_systems * 100) : 0}% of total`} />
            <MetricCard label="Inactive"         value={data.inactive_systems} accent="amber" />
          </Section>

          {/* Last 30 days */}
          <Section title="Last 30 Days">
            <MetricCard label="Evaluations"      value={data.total_evaluations_last_30_days}      accent="slate" />
            <MetricCard label="Systems w/ DENY"  value={data.systems_with_deny_last_30_days}      accent="red"
              sub="distinct systems" />
            <MetricCard label="Systems w/ FLAG"  value={data.systems_with_flag_last_30_days}      accent="amber"
              sub="distinct systems" />
            <MetricCard label="Critical Violations" value={data.total_critical_violations_last_30_days} accent="red" />
            <MetricCard label="Warning Violations"  value={data.total_warning_violations_last_30_days}  accent="amber" />
          </Section>

          {/* Advisory */}
          <Section title="Advisory (All Time)">
            <MetricCard
              label="Product Advisory"
              value={data.systems_with_product_advisory_violations}
              accent={data.systems_with_product_advisory_violations > 0 ? "amber" : "emerald"}
              sub="systems w/ PROD-001/002"
            />
            <MetricCard
              label="Sovereignty Advisory"
              value={data.systems_with_sovereignty_advisory_violations}
              accent={data.systems_with_sovereignty_advisory_violations > 0 ? "amber" : "emerald"}
              sub="systems w/ SOVR-* warning"
            />
          </Section>
        </div>
      )}
    </div>
  );
}
