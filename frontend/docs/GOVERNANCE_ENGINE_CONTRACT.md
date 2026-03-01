# Governance Engine Contract: `analyzeGovernance(payload)`

## Scope

This document specifies the exact public contract of the frontend analyzer entrypoint:

`analyzeGovernance(payload): GovernanceEvaluationResult`

This contract is derived from the current implementation in `frontend/src/analyzer.ts` and the deterministic engine types and evaluation logic in `frontend/src/engine/*`.

## Function signature

`analyzeGovernance(payload: unknown): GovernanceEvaluationResult`

The function accepts an arbitrary JavaScript value (`unknown`). It performs deterministic, defensive normalization to build the engine input model and then runs the deterministic governance engine.

## Purity, determinism, and side effects

`analyzeGovernance` is deterministic and free of external side effects.

Given the same `payload` value, `analyzeGovernance` will return the same result, including the ordering of `violations`, the ordering of `evaluatedRuleCodes`, and the contents of `normalizationWarnings`.

`analyzeGovernance` performs normalization only. It does not perform network calls, does not read from or write to storage, does not log to the console, and does not produce any observable side effects outside of returning its result value.

The underlying engine function `runDeterministicGovernanceEngine` is also explicitly implemented as a pure function with no I/O and no mutation of its input.

## Return type: `GovernanceEvaluationResult` (public contract)

### Top-level fields (always present)

`analyzeGovernance` returns an object with the following fields:

1. `outcome`
2. `score`
3. `violations`
4. `evaluatedRuleCodes`
5. `normalizationWarnings`

The first four fields come from the governance engine’s `GovernanceEvaluationResult` type. The `normalizationWarnings` field is contract-hardened by the analyzer and is always present on the returned object.

### Types (TypeScript-style)

```ts
type Outcome = "ALLOW" | "FLAG" | "DENY";

type Severity = "CRITICAL" | "WARNING" | "INFORMATIONAL";

interface GovernanceScore {
  // Total risk score, clamped deterministically to the range [0, 100].
  total: number;

  criticalCount: number;
  warningCount: number;
  informationalCount: number;
}

interface GovernanceViolation {
  // Stable rule identifier (for example: "SOVR-001").
  ruleCode: string;

  severity: Severity;

  // Human-readable description of the violation. The evaluator normalizes this to a string.
  message: string;

  // Optional subject identifier, for example: "system:<id>", "component:<id>", "product:<id>".
  subject?: string;

  // Optional structured payload for trace/debug display.
  details?: Record<string, unknown>;
}

interface NormalizationWarning {
  // Stable analyzer warning identifier.
  code: string;

  // Human-readable warning message.
  message: string;

  // Optional structured details.
  details?: Record<string, unknown>;
}

/**
 * Public contract of analyzeGovernance(payload).
 *
 * Note: the engine’s type definition includes outcome/score/violations/evaluatedRuleCodes.
 * The analyzer additionally guarantees normalizationWarnings is always present and an array.
 */
interface GovernanceEvaluationResult {
  outcome: Outcome;
  score: GovernanceScore;
  violations: GovernanceViolation[];
  evaluatedRuleCodes: string[];

  // Analyzer contract hardening:
  normalizationWarnings: NormalizationWarning[];
}
```

## Field-by-field contract details

### `outcome: "ALLOW" | "FLAG" | "DENY"`

The overall decision derived deterministically from the final `violations` set:

If any violation has severity `CRITICAL`, the outcome is `DENY`. Otherwise, if any violation has severity `WARNING`, the outcome is `FLAG`. Otherwise, the outcome is `ALLOW`.

### `score: GovernanceScore`

A deterministic scoring breakdown derived from the final `violations` set. The `score.total` is clamped deterministically to `[0, 100]`.

### `violations: GovernanceViolation[]`

A list of all violations produced by deterministic rule evaluation.

#### Ordering guarantee for `violations`

`violations` are deterministically sorted. The comparator is:

1. `severity` descending (`CRITICAL` first, then `WARNING`, then `INFORMATIONAL`)
2. `ruleCode` ascending (lexicographic)
3. `subject` ascending (lexicographic; missing/undefined is treated as an empty string for comparison)
4. `message` ascending (lexicographic; missing/undefined is treated as an empty string for comparison)

This means callers may rely on the array ordering being stable across runs for the same normalized input.

### `evaluatedRuleCodes: string[]`

A deterministic trace of which rule codes were evaluated for the run.

#### Ordering guarantee for `evaluatedRuleCodes`

`evaluatedRuleCodes` is returned in deterministic order. The evaluation pipeline ensures that:

1. Rules are evaluated in a stable order (sorted by rule code), and
2. The returned `evaluatedRuleCodes` array is also sorted lexicographically before returning.

This means callers may rely on the array ordering being stable across runs for the same normalized input and the same rule set.

### `normalizationWarnings: NormalizationWarning[]`

This field is guaranteed by the analyzer to always exist and to always be an array, even though it is not part of the engine’s `GovernanceEvaluationResult` interface in `frontend/src/engine/types.ts`.

#### Guarantee: always present, always an array

`analyzeGovernance` enforces the following contract:

If `normalizationWarnings` is not already an array on the engine result, the analyzer sets it to `[]` before returning.

Therefore, consumers of `analyzeGovernance` do not need to null-check `normalizationWarnings` and may safely iterate it as an array.

#### When warnings are emitted

The analyzer may add a structured warning when, after normalization, the system lacks both:

1. `system.sovereigntyLevel`, and
2. `system.components`

In that specific case, the analyzer attaches a deterministic warning object with:

- `code: "ANALYZER_NORMALIZATION_MISSING_SYSTEM_CONTEXT"`
- a stable `message`
- `details` including `payloadWrappedSystem`, `systemId`, and `systemName`

If the condition does not occur, the array is empty unless other analyzer logic has already populated it (the analyzer still guarantees an array will be present).

## Normalization behavior (high level)

`analyzeGovernance` normalizes input only and is designed to avoid throwing due to missing or mis-shaped fields.

Examples of normalization decisions that affect determinism (non-exhaustive, as implementation details may evolve):

The analyzer supports a wrapper shape where `payload.system` is treated as the system root. It also accepts `downstreamSystemIds` (or `downstream_system_ids`) at the top level, normalizing it to an optional array of strings. It normalizes common snake_case vs camelCase variants for system/component/product fields and performs strict parsing for booleans and numbers.

## Compatibility notes

The governance engine’s `GovernanceEvaluationResult` type in `frontend/src/engine/types.ts` does not declare `normalizationWarnings`. The analyzer nonetheless returns a value that includes `normalizationWarnings` and guarantees it is always present and always an array. Consumers should treat `normalizationWarnings` as part of the public contract of `analyzeGovernance`.
