import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Server,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Layers,
  ChevronLeft,
} from "lucide-react";
import api from "../api/client";
import SovereigntyBadge from "../components/SovereigntyBadge";
import { getRuleMetadata } from "../engine/ruleRegistry";
import { getRulesForSystem } from "../engine/ruleSelectors";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";

/* ── small helpers ── */
const OutcomeBadge = ({ outcome }) => {
  const map = {
    DENY: "bg-red-500/15 text-red-300 border-red-500/30",
    FLAG: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    ALLOW: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-mono font-semibold
      ${map[outcome] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}
    >
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
  <tr>
    <td colSpan={cols} className="py-6 text-center text-slate-600 text-xs">
      {label}
    </td>
  </tr>
);

/**
 * Sidebar system item with a collapsible Rule Trace section.
 * Rule Trace is metadata-only and derived deterministically from the local rule registry.
 */
function SystemListItem({ system, isSelected, onSelect }) {
  const rules = useMemo(() => getRulesForSystem(system), [system]);

  const [traceOpen, setTraceOpen] = useState(false);

  // Reset open state if the list is reloaded and we receive a different system instance.
  useEffect(() => {
    setTraceOpen(false);
  }, [system?.system_id]);

  return (
    <div
      className={`w-full border-b border-slate-800/50 transition-colors ${
        isSelected ? "bg-indigo-600/10" : "hover:bg-slate-800/40"
      }`}
    >
      {/* Main select button (keeps existing selection behavior) */}
      <button
        type="button"
        onClick={() => onSelect(system)}
        className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between group border-l-2 ${
          isSelected ? "border-l-indigo-500" : "border-l-transparent"
        }`}
      >
        <div className="min-w-0">
          <p
            className={`text-xs font-mono truncate ${
              isSelected ? "text-indigo-200" : "text-slate-300"
            }`}
          >
            {system.system_name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-600 font-mono">
              L{system.layer_id}
            </span>
            <SovereigntyBadge level={system.sovereignty_level} />
            {!system.is_active && (
              <span className="text-[10px] text-slate-600">inactive</span>
            )}
          </div>
        </div>

        <ChevronRight
          size={13}
          className={`flex-shrink-0 ml-2 transition-colors ${
            isSelected
              ? "text-indigo-400"
              : "text-slate-700 group-hover:text-slate-500"
          }`}
        />
      </button>

      {/* Collapsible Rule Trace */}
      <div className="px-4 pb-3">
        <Collapsible open={traceOpen} onOpenChange={setTraceOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 text-left"
              aria-label="Toggle rule trace"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronRight
                  size={12}
                  className={`text-slate-600 transition-transform ${
                    traceOpen ? "rotate-90" : ""
                  }`}
                />
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                  Rule Trace
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-800 bg-[#0d0d14] text-slate-500">
                  {rules.length}
                </span>
              </div>

              <span className="text-[10px] text-slate-700 font-mono whitespace-nowrap">
                metadata only
              </span>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mt-2 bg-[#0d0d14] border border-slate-800 rounded-lg overflow-hidden">
              {rules.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-600">
                  No rules traced for this system.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {rules.map((r) => (
                    <div key={r.ruleCode} className="px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-mono text-slate-200 truncate">
                            {r.ruleCode}
                          </div>
                          {r.description ? (
                            <div className="mt-1 text-[11px] leading-snug text-slate-500">
                              {r.description}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {r.domain ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                              {r.domain}
                            </span>
                          ) : null}
                          {r.introducedInPolicyVersion ? (
                            <span className="text-[10px] text-slate-700 font-mono">
                              v{r.introducedInPolicyVersion}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {r.documentReference ? (
                        <div className="mt-2 text-[10px] font-mono text-slate-600">
                          {r.documentReference}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Tab: Risk Summary
──────────────────────────────────────────────────────────────────────────── */
function RiskTab({ systemId }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setD(null);
    setLoading(true);
    setError(null);
    api
      .get(`/systems/${systemId}/risk-summary`)
      .then((r) => setD(r.data))
      .catch((e) => setError(e?.response?.data?.detail?.message ?? e.message))
      .finally(() => setLoading(false));
  }, [systemId]);

  if (loading) {
    return (
      <div className="p-4">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4">
        <Err msg={error} />
      </div>
    );
  }
  if (!d) return null;

  const StatRow = ({ label, value, accent }) => {
    const c = {
      red: "text-red-300",
      amber: "text-amber-300",
      emerald: "text-emerald-300",
      slate: "text-slate-200",
    };
    return (
      <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
        <span className="text-xs text-slate-400">{label}</span>
        <span
          className={`text-sm font-mono font-semibold tabular-nums ${
            c[accent] ?? c.slate
          }`}
        >
          {value}
        </span>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* All-time */}
      <div className="bg-[#0d0d14] border border-slate-800 rounded-lg p-4">
        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">
          All Time
        </p>
        <StatRow
          label="Total Evaluations"
          value={d.total_evaluations}
          accent="slate"
        />
        <StatRow label="Allow" value={d.total_allow} accent="emerald" />
        <StatRow label="Flag" value={d.total_flag} accent="amber" />
        <StatRow label="Deny" value={d.total_deny} accent="red" />
        <StatRow
          label="Critical Violations"
          value={d.total_critical_violations}
          accent="red"
        />
        <StatRow
          label="Warning Violations"
          value={d.total_warning_violations}
          accent="amber"
        />
        <StatRow
          label="Most Violated Rule"
          value={d.most_violated_rule_code ?? "—"}
          accent={d.most_violated_rule_code ? "amber" : "slate"}
        />
      </div>

      {/* 7-day windows */}
      <div className="grid grid-cols-2 gap-3">
        {[
          [d.last_7_days, "Last 7 Days"],
          [d.previous_7_days, "Prev 7 Days"],
        ].map(([w, title]) => (
          <div
            key={title}
            className="bg-[#0d0d14] border border-slate-800 rounded-lg p-4"
          >
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">
              {title}
            </p>
            <StatRow label="Evaluations" value={w.evaluations} accent="slate" />
            <StatRow label="Deny" value={w.deny} accent="red" />
            <StatRow label="Flag" value={w.flag} accent="amber" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Tab: Dependency Map
──────────────────────────────────────────────────────────────────────────── */
function DependencyTab({ systemId }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setD(null);
    setLoading(true);
    setError(null);
    api
      .get(`/systems/${systemId}/dependency-map`)
      .then((r) => setD(r.data))
      .catch((e) => setError(e?.response?.data?.detail?.message ?? e.message))
      .finally(() => setLoading(false));
  }, [systemId]);

  if (loading) {
    return (
      <div className="p-4">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4">
        <Err msg={error} />
      </div>
    );
  }
  if (!d) return null;

  return (
    <div className="p-4 space-y-5">
      {/* Interfaces */}
      <div className="grid grid-cols-2 gap-3">
        {/* Upstream */}
        <div className="bg-[#0d0d14] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight size={13} className="text-indigo-400" />
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Upstream ({d.interfaces.upstream.length})
            </p>
          </div>
          {d.interfaces.upstream.length === 0 ? (
            <p className="text-xs text-slate-600">No upstream interfaces</p>
          ) : (
            d.interfaces.upstream.map((s) => (
              <div
                key={s.system_id}
                className="flex items-center justify-between py-1.5 border-b border-slate-800/40 last:border-0"
              >
                <span className="text-xs text-slate-300 font-mono truncate max-w-[120px]">
                  {s.system_name}
                </span>
                <SovereigntyBadge level={s.sovereignty_level} />
              </div>
            ))
          )}
        </div>

        {/* Downstream */}
        <div className="bg-[#0d0d14] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownRight size={13} className="text-slate-400" />
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Downstream ({d.interfaces.downstream.length})
            </p>
          </div>
          {d.interfaces.downstream.length === 0 ? (
            <p className="text-xs text-slate-600">No downstream interfaces</p>
          ) : (
            d.interfaces.downstream.map((s) => (
              <div
                key={s.system_id}
                className="flex items-center justify-between py-1.5 border-b border-slate-800/40 last:border-0"
              >
                <span className="text-xs text-slate-300 font-mono truncate max-w-[120px]">
                  {s.system_name}
                </span>
                <SovereigntyBadge level={s.sovereignty_level} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Components */}
      <div className="bg-[#0d0d14] border border-slate-800 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
          <Layers size={13} className="text-slate-500" />
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
            Active Components ({d.components.length})
          </p>
        </div>
        {d.components.length === 0 ? (
          <p className="px-4 py-5 text-xs text-slate-600">
            No active components
          </p>
        ) : (
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
              {d.components.map((c) => (
                <tr
                  key={c.component_id}
                  className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="px-4 py-2.5 text-slate-200 font-mono">
                    {c.component_name}
                  </td>
                  <td className="px-4 py-2.5">
                    <SovereigntyBadge level={c.sovereignty_level} />
                  </td>
                  {c.product ? (
                    <>
                      <td className="px-4 py-2.5 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Package size={11} className="text-indigo-400" />
                          {c.product.canonical_name}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {c.product.vendor_name}{" "}
                        <span className="text-slate-600">
                          ({c.product.vendor_country})
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <SovereigntyBadge level={c.product.sovereignty_level} />
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={
                            c.product.zero_cloud_capable
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          {c.product.zero_cloud_capable ? "Yes" : "No"}
                        </span>
                      </td>
                    </>
                  ) : (
                    <td colSpan={4} className="px-4 py-2.5 text-slate-600 italic">
                      No product linked
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Tab: Recent Evaluations
──────────────────────────────────────────────────────────────────────────── */
function EvaluationsTab({ systemId }) {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inline per-violation toggle state (deterministic; no fetching)
  const [expandedViolationKeys, setExpandedViolationKeys] = useState({});

  // Client-side rule filter state (no fetching).
  const [ruleFilter, setRuleFilter] = useState("All");

  useEffect(() => {
    setD(null);
    setLoading(true);
    setError(null);
    api
      .get(`/systems/${systemId}/evaluation-history`, {
        params: { page, page_size: PAGE_SIZE },
      })
      .then((r) => setD(r.data))
      .catch((e) => setError(e?.response?.data?.detail?.message ?? e.message))
      .finally(() => setLoading(false));
  }, [systemId, page]);

  // reset page when system changes
  useEffect(() => {
    setPage(1);
  }, [systemId]);

  // reset expanded sections when system changes (prevents stale expansion keys)
  useEffect(() => {
    setExpandedViolationKeys({});
  }, [systemId]);

  // reset rule filter when system changes
  useEffect(() => {
    setRuleFilter("All");
  }, [systemId]);

  const items = useMemo(() => d?.items ?? [], [d]);

  // Dynamic rule options are derived from the violations currently present in the loaded items.
  const availableRuleCodes = Array.from(
    new Set(
      items
        .flatMap((ev) => (ev.violations ?? []).map((v) => v.rule_code))
        .filter(Boolean)
    )
  ).sort((a, b) => String(a).localeCompare(String(b)));

  // If user selected a rule that isn't present on this page anymore, normalize back to "All".
  const normalizedRuleFilter =
    ruleFilter === "All" || availableRuleCodes.includes(ruleFilter)
      ? ruleFilter
      : "All";

  useEffect(() => {
    // Preserve existing behavior: do not auto-normalize during loading/empty states.
    if (loading || !d) return;

    if (ruleFilter !== normalizedRuleFilter) {
      setRuleFilter(normalizedRuleFilter);
    }
  }, [d, loading, normalizedRuleFilter, ruleFilter]);

  const governanceSummary = useMemo(() => {
    // Compute summary from the same violations that are currently displayed (i.e., after
    // the client-side rule filter is applied). This intentionally does NOT alter any
    // existing fetching, filtering, or metadata-toggle logic.
    const violations = (items ?? []).flatMap((ev) =>
      (ev.violations ?? []).filter(
        (v) => normalizedRuleFilter === "All" || v.rule_code === normalizedRuleFilter
      )
    );

    const byFamily = {};
    for (const v of violations) {
      const code = v?.rule_code;
      if (!code) continue;

      // Rule family prefix: text before the first "-" (e.g., "SOVR-001" -> "SOVR").
      // If the code has no "-", we treat the entire code as its family.
      const raw = String(code);
      const family = raw.includes("-") ? raw.split("-")[0] : raw;

      byFamily[family] = (byFamily[family] ?? 0) + 1;
    }

    const families = Object.entries(byFamily)
      .map(([family, count]) => ({ family, count }))
      .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family));

    return { total: violations.length, families };
  }, [items, normalizedRuleFilter]);

  const toggleViolation = (key) => {
    setExpandedViolationKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="p-4">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4">
        <Err msg={error} />
      </div>
    );
  }
  if (!d) return null;

  return (
    <div className="p-4 flex flex-col lg:flex-row gap-4">
      {/* Left: table + controls */}
      <div className="flex-1 min-w-0">
        {/* Filter control (client-side only) */}
        <div className="flex items-center gap-3 mb-3">
          <label
            htmlFor="rule-filter"
            className="text-[10px] text-slate-500 font-mono uppercase tracking-widest"
          >
            Filter by rule
          </label>
          <select
            id="rule-filter"
            value={normalizedRuleFilter}
            onChange={(e) => setRuleFilter(e.target.value)}
            className="bg-[#0d0d14] border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          >
            <option value="All">All</option>
            {availableRuleCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

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
              {items.length === 0 ? (
                <EmptyRow cols={5} label="No evaluations" />
              ) : (
                items.map((ev) => (
                  <tr
                    key={ev.event_id}
                    className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(ev.triggered_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono">
                      {ev.event_type}
                    </td>
                    <td className="px-4 py-2.5">
                      <OutcomeBadge outcome={ev.outcome} />
                    </td>
                    <td className="px-4 py-2.5">
                      {ev.violations?.length > 0 ? (
                        (() => {
                          // Keep the original violation index for deterministic expansion keys,
                          // even after filtering.
                          const filtered = (ev.violations ?? [])
                            .map((v, i) => ({ v, i }))
                            .filter(
                              ({ v }) =>
                                normalizedRuleFilter === "All" ||
                                v.rule_code === normalizedRuleFilter
                            );

                          if (filtered.length === 0) {
                            return <span className="text-slate-700">—</span>;
                          }

                          return (
                            <div className="flex flex-wrap gap-1">
                              {filtered.map(({ v, i }) => {
                                const key = `${ev.event_id}:${i}:${v.rule_code}`;
                                const md = getRuleMetadata(v.rule_code);
                                const hasMd =
                                  !!md && (!!md.description || !!md.documentReference);
                                const expanded = !!expandedViolationKeys[key];

                                // If metadata is missing, we must display ONLY the rule code (no crash, no fallback text).
                                if (!hasMd) {
                                  return (
                                    <span
                                      key={key}
                                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-400"
                                    >
                                      {v.rule_code}
                                    </span>
                                  );
                                }

                                return (
                                  <div key={key} className="flex flex-col">
                                    <button
                                      type="button"
                                      onClick={() => toggleViolation(key)}
                                      aria-expanded={expanded}
                                      className="text-left text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 hover:text-slate-200 transition-colors"
                                      title="Click to toggle rule details"
                                    >
                                      {v.rule_code}
                                    </button>

                                    {expanded && (
                                      <div className="mt-1 px-1.5 py-1 rounded border border-slate-800 bg-[#0b0b12]">
                                        {md.description ? (
                                          <div className="text-[11px] leading-snug text-slate-500">
                                            {md.description}
                                          </div>
                                        ) : null}

                                        {md.documentReference ? (
                                          <div className="mt-1 text-[10px] font-mono text-slate-600">
                                            {md.documentReference}
                                          </div>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono">
                      {ev.triggered_by ?? "—"}
                    </td>
                  </tr>
                ))
              )}
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-[11px] text-slate-500 font-mono">
              page {page}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!d.has_next || loading}
              className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Governance Summary panel */}
      <div className="w-full lg:w-72 flex-shrink-0">
        <div className="lg:sticky lg:top-4 bg-[#0d0d14] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Governance Summary
            </p>
            {normalizedRuleFilter !== "All" ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                {normalizedRuleFilter}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex items-baseline justify-between border-b border-slate-800/60 pb-3">
            <span className="text-xs text-slate-400">Total violations</span>
            <span className="text-lg font-mono font-semibold tabular-nums text-slate-200">
              {governanceSummary.total}
            </span>
          </div>

          <div className="mt-3">
            <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">
              By family
            </p>

            {governanceSummary.families.length === 0 ? (
              <p className="text-xs text-slate-600">No violations in current view.</p>
            ) : (
              <div className="space-y-2">
                {governanceSummary.families.map(({ family, count }) => (
                  <div
                    key={family}
                    className="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-0"
                  >
                    <span className="text-xs text-slate-300 font-mono truncate max-w-[170px]">
                      {family}
                    </span>
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   System Detail Panel
──────────────────────────────────────────────────────────────────────────── */
const TABS = [
  { id: "risk", label: "Risk Summary" },
  { id: "map", label: "Dependency Map" },
  { id: "evals", label: "Evaluations" },
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
            <span className="text-sm font-semibold text-slate-100 font-mono">
              {system.system_name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-slate-600 font-mono">
              L{system.layer_id}
            </span>
            <SovereigntyBadge level={system.sovereignty_level} />
            {system.zero_cloud_required && (
              <span className="text-[10px] text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono">
                ZERO-CLOUD
              </span>
            )}
            {!system.is_active && (
              <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                INACTIVE
              </span>
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
        {TABS.map((t) => (
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
        {tab === "risk" && <RiskTab systemId={system.system_id} />}
        {tab === "map" && <DependencyTab systemId={system.system_id} />}
        {tab === "evals" && <EvaluationsTab systemId={system.system_id} />}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   System Explorer (root view)
──────────────────────────────────────────────────────────────────────────── */
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
          <div className="p-4 text-xs text-slate-600 animate-pulse">
            Loading systems…
          </div>
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
            <p className="px-4 py-6 text-xs text-slate-600 text-center">
              No systems registered
            </p>
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
            <p className="text-xs text-slate-700 mt-1">
              Risk summary · Dependency map · Evaluations
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
