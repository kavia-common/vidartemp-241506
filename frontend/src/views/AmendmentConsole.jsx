import React, { useEffect, useState, useCallback } from "react";
import {
  FileText, ChevronRight, ChevronLeft, RefreshCw,
  AlertTriangle, CheckCircle, XCircle, Play,
  Clock, User, ArrowRight, Package2, Zap,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import api from "../api/client";

/* ── shared style maps ─────────────────────────────────────────────────── */

const STATE_STYLE = {
  PROPOSED:     "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  UNDER_REVIEW: "bg-amber-500/15  text-amber-300  border-amber-500/30",
  APPROVED:     "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  EXECUTED:     "bg-teal-500/15   text-teal-300   border-teal-500/30",
  REJECTED:     "bg-red-500/15    text-red-300    border-red-500/30",
  WITHDRAWN:    "bg-slate-500/15  text-slate-400  border-slate-600",
};

const TYPE_STYLE = {
  SUBSTITUTION: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  MODIFICATION: "bg-blue-500/15   text-blue-300   border-blue-500/30",
  DECOMMISSION: "bg-red-500/15    text-red-300    border-red-500/30",
  ADDITION:     "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

const StateBadge = ({ state }) => (
  <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-mono font-semibold
    ${STATE_STYLE[state] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
    {state}
  </span>
);

const TypeBadge = ({ type }) => (
  <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-mono
    ${TYPE_STYLE[type] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}>
    {type}
  </span>
);

const Spinner = () => <RefreshCw size={14} className="animate-spin text-slate-500" />;

const Err = ({ msg }) => (
  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border
    border-red-500/20 rounded px-3 py-2 my-2">
    <AlertTriangle size={13} /> {msg}
  </div>
);

const ts = (iso) => iso ? new Date(iso).toLocaleString() : "—";

const TERMINAL = new Set(["EXECUTED", "REJECTED", "WITHDRAWN"]);

/* ── simulation result panel ─────────────────────────────────────────── */

const OUTCOME_STYLE = {
  ALLOW: "text-emerald-300",
  FLAG:  "text-amber-300",
  DENY:  "text-red-300",
};

const SeverityBadge = ({ severity }) => {
  const m = {
    CRITICAL:     "bg-red-500/15    text-red-300    border-red-500/30",
    WARNING:      "bg-amber-500/15  text-amber-300  border-amber-500/30",
    INFORMATIONAL:"bg-blue-500/15   text-blue-300   border-blue-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-mono font-semibold
      ${m[severity] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
      {severity}
    </span>
  );
};

const DeltaIcon = ({ delta }) => {
  if (delta > 0) return <TrendingUp size={12} className="text-red-400" />;
  if (delta < 0) return <TrendingDown size={12} className="text-emerald-400" />;
  return <Minus size={12} className="text-slate-600" />;
};

function SimulationPanel({ amendmentId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [result,  setResult]  = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    api.post(`/amendments/${amendmentId}/simulate`)
      .then(r => setResult(r.data))
      .catch(e => setError(e?.response?.data?.detail?.message ?? e.message))
      .finally(() => setLoading(false));
  }, [amendmentId]);

  return (
    <div className="mt-3 bg-[#0a0a10] border border-indigo-500/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-indigo-500/5">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-indigo-400" />
          <span className="text-[11px] font-mono text-indigo-300 uppercase tracking-widest">
            Impact Simulation
          </span>
          {result && (
            <span className="text-[10px] text-slate-600 font-mono">
              — {result.simulated_event_type}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-400 text-xs transition-colors">✕</button>
      </div>

      <div className="p-4">
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
            <Spinner /> Running simulation…
          </div>
        )}
        {error && <Err msg={error} />}
        {result && (
          <div className="space-y-4">

            {/* Predicted outcome + risk delta */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0d0d14] border border-slate-800 rounded p-3">
                <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider mb-1">Predicted</p>
                <p className={`text-lg font-mono font-bold ${OUTCOME_STYLE[result.predicted_outcome] ?? "text-slate-200"}`}>
                  {result.predicted_outcome}
                </p>
                {result.risk_delta.current_outcome && (
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    was <span className={OUTCOME_STYLE[result.risk_delta.current_outcome]}>{result.risk_delta.current_outcome}</span>
                    {result.risk_delta.outcome_changed && <span className="text-amber-500 ml-1">← changed</span>}
                  </p>
                )}
                {!result.risk_delta.current_outcome && (
                  <p className="text-[10px] text-slate-700 mt-0.5">no prior evaluation</p>
                )}
              </div>

              <div className="bg-[#0d0d14] border border-slate-800 rounded p-3">
                <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider mb-1">Critical Δ</p>
                <div className="flex items-center gap-1.5">
                  <DeltaIcon delta={result.risk_delta.critical_delta} />
                  <span className={`text-lg font-mono font-bold tabular-nums ${
                    result.risk_delta.critical_delta > 0 ? "text-red-300" :
                    result.risk_delta.critical_delta < 0 ? "text-emerald-300" : "text-slate-500"}`}>
                    {result.risk_delta.critical_delta > 0 ? "+" : ""}{result.risk_delta.critical_delta}
                  </span>
                </div>
              </div>

              <div className="bg-[#0d0d14] border border-slate-800 rounded p-3">
                <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider mb-1">Warning Δ</p>
                <div className="flex items-center gap-1.5">
                  <DeltaIcon delta={result.risk_delta.warning_delta} />
                  <span className={`text-lg font-mono font-bold tabular-nums ${
                    result.risk_delta.warning_delta > 0 ? "text-amber-300" :
                    result.risk_delta.warning_delta < 0 ? "text-emerald-300" : "text-slate-500"}`}>
                    {result.risk_delta.warning_delta > 0 ? "+" : ""}{result.risk_delta.warning_delta}
                  </span>
                </div>
              </div>
            </div>

            {/* Predicted violations */}
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">
                Predicted Violations ({result.predicted_violations.length})
              </p>
              {result.predicted_violations.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded px-3 py-2">
                  <CheckCircle size={12} /> No violations predicted.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {result.predicted_violations.map((v, i) => (
                    <div key={i} className="bg-[#0d0d14] border border-slate-800 rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={v.severity} />
                        <span className="text-[10px] font-mono text-slate-400">{v.rule_code}</span>
                      </div>
                      <p className="text-xs text-slate-400">{v.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Downstream */}
            {result.affected_downstream_system_ids.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded p-3">
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">
                  Affected Downstream ({result.affected_downstream_system_ids.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.affected_downstream_system_ids.map(id => (
                    <span key={id} className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      {String(id).substring(0, 8)}…
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}



function ActionPanel({ amendmentId, action, onDone, onCancel }) {
  const isExecute = action === "execute";
  const [actor,   setActor]   = useState("");
  const [notes,   setNotes]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const label  = { approve: "Approve", reject: "Reject", execute: "Execute" }[action];
  const actKey = isExecute ? "resolved_by" : "transitioned_by";

  const accent = {
    approve: "bg-emerald-600 hover:bg-emerald-500",
    reject:  "bg-red-700    hover:bg-red-600",
    execute: "bg-teal-700   hover:bg-teal-600",
  }[action];

  const submit = async () => {
    if (!actor.trim()) { setError("Actor name is required."); return; }
    setLoading(true); setError(null);
    try {
      await api.post(`/amendments/${amendmentId}/${action}`, {
        [actKey]: actor.trim(),
        notes:    notes.trim() || null,
      });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.detail?.message ?? e?.response?.data?.detail ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 bg-[#0d0d14] border border-slate-700 rounded-lg p-4 space-y-3">
      <p className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-widest">
        {label} Amendment
      </p>
      {error && <Err msg={error} />}

      <div className="space-y-2">
        <label className="text-[11px] text-slate-500">
          {isExecute ? "Resolved by" : "Actioned by"} <span className="text-red-400">*</span>
        </label>
        <input
          value={actor}
          onChange={e => setActor(e.target.value)}
          placeholder="actor / system identifier"
          className="w-full bg-[#09090e] border border-slate-700 rounded px-3 py-1.5
            text-xs text-slate-200 placeholder-slate-600 focus:outline-none
            focus:border-indigo-500 transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[11px] text-slate-500">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Rationale or context…"
          className="w-full bg-[#09090e] border border-slate-700 rounded px-3 py-1.5
            text-xs text-slate-200 placeholder-slate-600 focus:outline-none
            focus:border-indigo-500 transition-colors resize-none"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={submit}
          disabled={loading}
          className={`px-4 py-1.5 rounded text-xs font-semibold text-white
            transition-colors disabled:opacity-40 ${accent}`}
        >
          {loading ? "Submitting…" : `Confirm ${label}`}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200
            border border-slate-700 hover:border-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── amendment detail panel ────────────────────────────────────────────── */

function AmendmentDetail({ amendmentId, onClose }) {
  const [d,       setD]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [action,  setAction]  = useState(null); // "approve" | "reject" | "execute"
  const [showSim, setShowSim] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError(null); setAction(null);
    api.get(`/amendments/${amendmentId}`)
      .then(r => setD(r.data))
      .catch(e => setError(e?.response?.data?.detail?.message ?? e.message))
      .finally(() => setLoading(false));
  }, [amendmentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-5 flex items-center gap-2 text-slate-500"><Spinner /><span className="text-xs">Loading…</span></div>;
  if (error)   return <div className="p-5"><Err msg={error} /></div>;
  if (!d)      return null;

  const isTerminal = TERMINAL.has(d.current_state);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText size={14} className="text-indigo-400 flex-shrink-0" />
            <span className="text-sm font-semibold font-mono text-slate-100 truncate">
              {d.amendment_code}
            </span>
            <StateBadge state={d.current_state} />
            <TypeBadge  type={d.amendment_type} />
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{d.description}</p>
        </div>
        <button onClick={onClose} className="ml-3 text-slate-600 hover:text-slate-300 text-sm transition-colors flex-shrink-0">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Amendment ID",  d.amendment_id,     "mono"],
            ["Target System", d.target_system_id, "mono"],
            ["Proposed By",   d.proposed_by,      ""],
            ["Proposed At",   ts(d.proposed_at),  ""],
            ["Resolved By",   d.resolved_by ?? "—", ""],
            ["Resolved At",   ts(d.resolved_at),  ""],
          ].map(([label, val, cls]) => (
            <div key={label} className="bg-[#0d0d14] border border-slate-800 rounded p-3">
              <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-xs text-slate-300 break-all ${cls === "mono" ? "font-mono" : ""}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Simulation */}
        <div>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">Simulation</p>
          <button
            onClick={() => setShowSim(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
              bg-indigo-600/15 text-indigo-300 border border-indigo-500/30
              hover:bg-indigo-600/25 transition-colors"
          >
            <Zap size={12} /> {showSim ? "Hide Simulation" : "Run Impact Simulation"}
          </button>
          {showSim && (
            <SimulationPanel
              amendmentId={d.amendment_id}
              onClose={() => setShowSim(false)}
            />
          )}
        </div>

        {/* Actions */}
        {!isTerminal && (
          <div>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">Actions</p>
            <div className="flex items-center gap-2 flex-wrap">
              {(d.current_state === "PROPOSED" || d.current_state === "UNDER_REVIEW") && (
                <>
                  <button
                    onClick={() => setAction(action === "approve" ? null : "approve")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
                      bg-emerald-600/20 text-emerald-300 border border-emerald-600/30
                      hover:bg-emerald-600/30 transition-colors"
                  >
                    <CheckCircle size={12} /> Approve
                  </button>
                  <button
                    onClick={() => setAction(action === "reject" ? null : "reject")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
                      bg-red-600/20 text-red-300 border border-red-600/30
                      hover:bg-red-600/30 transition-colors"
                  >
                    <XCircle size={12} /> Reject
                  </button>
                </>
              )}
              {d.current_state === "APPROVED" && (
                <button
                  onClick={() => setAction(action === "execute" ? null : "execute")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
                    bg-teal-600/20 text-teal-300 border border-teal-600/30
                    hover:bg-teal-600/30 transition-colors"
                >
                  <Play size={12} /> Execute
                </button>
              )}
            </div>

            {action && (
              <ActionPanel
                amendmentId={d.amendment_id}
                action={action}
                onDone={load}
                onCancel={() => setAction(null)}
              />
            )}
          </div>
        )}

        {/* Consumption */}
        {d.is_consumed && d.consumption && (
          <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package2 size={13} className="text-teal-400" />
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Consumed</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[10px] text-slate-600 font-mono mb-0.5">Consumed At</p>
                <p className="text-slate-300">{ts(d.consumption.consumed_at)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 font-mono mb-0.5">Operation</p>
                <p className="text-slate-300 font-mono">{d.consumption.consumed_by_op}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 font-mono mb-0.5">Entity</p>
                <p className="text-slate-300 font-mono text-[10px] break-all">{d.consumption.consuming_entity_id}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 font-mono mb-0.5">Entity Type</p>
                <p className="text-slate-300">{d.consumption.consuming_entity_type}</p>
              </div>
              {d.consumption.notes && (
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-600 font-mono mb-0.5">Notes</p>
                  <p className="text-slate-400">{d.consumption.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transition history */}
        <div>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">
            Transition History ({d.transitions?.length ?? 0})
          </p>
          {(!d.transitions || d.transitions.length === 0) ? (
            <p className="text-xs text-slate-700">No transitions recorded.</p>
          ) : (
            <div className="space-y-2">
              {d.transitions.map((t, i) => (
                <div key={t.transition_id ?? i}
                  className="bg-[#0d0d14] border border-slate-800 rounded p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-500">
                      {t.from_state ?? "—"}
                    </span>
                    <ArrowRight size={10} className="text-slate-700 flex-shrink-0" />
                    <StateBadge state={t.to_state} />
                    <span className="ml-auto text-[10px] text-slate-600">{ts(t.transitioned_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <User size={10} className="text-slate-600" />
                    <span className="text-[10px] text-slate-500 font-mono">{t.transitioned_by}</span>
                    {t.notes && (
                      <span className="text-[10px] text-slate-600 ml-2">— {t.notes}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ── amendment list ─────────────────────────────────────────────────────── */

const STATE_FILTERS = [
  "ALL", "PROPOSED", "UNDER_REVIEW", "APPROVED", "EXECUTED", "REJECTED", "WITHDRAWN",
];
const PAGE_SIZE = 20;

export default function AmendmentConsole() {
  const [amendments, setAmendments] = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [hasNext,    setHasNext]    = useState(false);
  const [stateFilter, setStateFilter] = useState("ALL");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [selected,   setSelected]   = useState(null);

  const load = useCallback(async (pg = page, sf = stateFilter) => {
    setLoading(true); setError(null);
    try {
      const params = { page: pg, page_size: PAGE_SIZE };
      if (sf !== "ALL") params.state = sf;
      const res = await api.get("/amendments", { params });
      setAmendments(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
      setHasNext(res.data.has_next ?? false);
    } catch (e) {
      setError(e?.response?.data?.detail?.message ?? e.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }, [page, stateFilter]);

  useEffect(() => {
    load(page, stateFilter);
  }, [load, page, stateFilter]);

  const handleFilter = (sf) => { setStateFilter(sf); setPage(1); setSelected(null); };
  const handlePage   = (pg) => { setPage(pg); setSelected(null); };
  const handleRefresh = () => { load(page, stateFilter); setSelected(null); };

  return (
    <div className="flex h-full">

      {/* ── Left: list ── */}
      <div className="w-80 flex-shrink-0 border-r border-slate-800 flex flex-col">

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-slate-100">Amendments</h1>
          <button onClick={handleRefresh} disabled={loading}
            className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* State filter */}
        <div className="px-3 py-2 border-b border-slate-800 flex flex-wrap gap-1">
          {STATE_FILTERS.map(sf => (
            <button
              key={sf}
              onClick={() => handleFilter(sf)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
                stateFilter === sf
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                  : "text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700"
              }`}
            >
              {sf}
            </button>
          ))}
        </div>

        {error && <div className="p-3"><Err msg={error} /></div>}
        {loading && !amendments.length && (
          <div className="p-4 text-xs text-slate-600 animate-pulse">Loading amendments…</div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {amendments.map(a => (
            <button
              key={a.amendment_id}
              onClick={() => setSelected(a.amendment_id)}
              className={`w-full text-left px-4 py-3 border-b border-slate-800/50 transition-colors
                flex items-start justify-between group border-l-2 ${
                  selected === a.amendment_id
                    ? "bg-indigo-600/10 border-l-indigo-500"
                    : "hover:bg-slate-800/40 border-l-transparent"
                }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs font-mono truncate ${
                    selected === a.amendment_id ? "text-indigo-200" : "text-slate-300"}`}>
                    {a.amendment_code}
                  </span>
                  <StateBadge state={a.current_state} />
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <TypeBadge type={a.amendment_type} />
                  <span className="text-[10px] text-slate-600 font-mono flex items-center gap-1">
                    <User size={9} />{a.proposed_by}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock size={9} className="text-slate-700" />
                  <span className="text-[10px] text-slate-600">{ts(a.proposed_at)}</span>
                </div>
                {a.latest_transition_at && (
                  <p className="text-[10px] text-slate-700 mt-0.5 flex items-center gap-1">
                    <ArrowRight size={8} /> last transition {ts(a.latest_transition_at)}
                  </p>
                )}
              </div>
              <ChevronRight size={12} className={`flex-shrink-0 ml-2 mt-0.5 transition-colors ${
                selected === a.amendment_id ? "text-indigo-400" : "text-slate-700 group-hover:text-slate-500"
              }`} />
            </button>
          ))}
          {!loading && amendments.length === 0 && (
            <p className="px-4 py-6 text-xs text-slate-600 text-center">
              No amendments{stateFilter !== "ALL" ? ` with state ${stateFilter}` : ""}.
            </p>
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 py-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-700 font-mono">{total} total</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => handlePage(page - 1)} disabled={page === 1 || loading}
              className="p-1 rounded border border-slate-800 text-slate-500 hover:text-slate-300
                disabled:opacity-30 transition-colors">
              <ChevronLeft size={11} />
            </button>
            <span className="text-[10px] text-slate-600 font-mono">p{page}</span>
            <button onClick={() => handlePage(page + 1)} disabled={!hasNext || loading}
              className="p-1 rounded border border-slate-800 text-slate-500 hover:text-slate-300
                disabled:opacity-30 transition-colors">
              <ChevronRight size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: detail ── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {selected ? (
          <AmendmentDetail
            key={selected}
            amendmentId={selected}
            onClose={() => setSelected(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <FileText size={32} className="text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">Select an amendment to inspect</p>
            <p className="text-xs text-slate-700 mt-1">
              Full history · Consumption metadata · Lifecycle actions
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
