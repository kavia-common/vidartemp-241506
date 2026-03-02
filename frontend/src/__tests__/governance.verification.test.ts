import { analyzeGovernance } from "../analyzer";

function deepClone<T>(v: T): T {
  // JSON-based deep clone is sufficient for this test payload (plain data only).
  return JSON.parse(JSON.stringify(v)) as T;
}

const payload = {
  system: {
    system_id: "SYS-1",
    sovereignty_level: "approved ",
    zero_cloud_required: "false",
    components: [
      {
        component_id: "COMP-2",
        sovereignty_level: "restricted",
        product: {
          product_id: "PROD-2",
          zero_cloud_capable: 1,
          advisory_rule_codes: "PROD-888",
        },
      },
      {
        component_id: "COMP-1",
        sovereignty_level: "restricted",
        product: {
          product_id: "PROD-1",
          zero_cloud_capable: 0,
          advisory_rule_codes: "PROD-999",
        },
      },
    ],
  },
  downstream_system_ids: ["SYS-2", "SYS-3"],
} as const;

const EVALUATION_FIELD_NAMES = new Set([
  "violations",
  "outcome",
  "score",
  "evaluatedRuleCodes",
]);

function isNonNullObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function collectEvaluationFieldPaths(
  v: unknown,
  path: string,
  out: string[],
): void {
  if (Array.isArray(v)) {
    v.forEach((item, i) => collectEvaluationFieldPaths(item, `${path}[${i}]`, out));
    return;
  }

  if (!isNonNullObject(v)) return;

  for (const key of Object.keys(v)) {
    if (EVALUATION_FIELD_NAMES.has(key)) out.push(`${path}.${key}`);
    collectEvaluationFieldPaths(v[key], `${path}.${key}`, out);
  }
}

describe("analyzeGovernance verification hardening", () => {
  test("Determinism: same payload yields deep-equal results with stable ordering", () => {
    const result1 = analyzeGovernance(payload);
    const result2 = analyzeGovernance(payload);

    // policyVersion assertions (hardening requirement)
    expect(result1).toHaveProperty("policyVersion");
    expect(result2).toHaveProperty("policyVersion");
    expect(typeof result1.policyVersion).toBe("string");
    expect(result1.policyVersion.trim().length).toBeGreaterThan(0);

    // Same payload produces deep-equal output (entire returned object)
    expect(result1).toEqual(result2);

    // Explicit ordering checks (even though deep equality would also fail on reordering)
    const componentsOrder1 = (result1.system.components ?? []).map(
      (c) => c.componentId ?? null,
    );
    const componentsOrder2 = (result2.system.components ?? []).map(
      (c) => c.componentId ?? null,
    );
    expect(componentsOrder1).toEqual(componentsOrder2);

    const warningsOrder1 = (result1.normalizationWarnings ?? []).map(
      (w) => w.code ?? null,
    );
    const warningsOrder2 = (result2.normalizationWarnings ?? []).map(
      (w) => w.code ?? null,
    );
    expect(warningsOrder1).toEqual(warningsOrder2);

    if (result1.downstreamSystemIds !== undefined || result2.downstreamSystemIds !== undefined) {
      // Stable ordering across identical runs
      expect(result1.downstreamSystemIds).toEqual(result2.downstreamSystemIds);
      // Also verify the ordering is preserved vs input (if present)
      expect(result1.downstreamSystemIds).toEqual([...payload.downstream_system_ids]);
    }

    // No evaluation fields are present (analyzer-only contract)
    const evalPaths1: string[] = [];
    const evalPaths2: string[] = [];
    collectEvaluationFieldPaths(result1, "$", evalPaths1);
    collectEvaluationFieldPaths(result2, "$", evalPaths2);

    expect(evalPaths1).toEqual([]);
    expect(evalPaths2).toEqual([]);

    // Extra explicit top-level guardrails
    expect(Object.prototype.hasOwnProperty.call(result1 as unknown as object, "violations")).toBe(
      false,
    );
    expect(Object.prototype.hasOwnProperty.call(result1 as unknown as object, "outcome")).toBe(
      false,
    );
    expect(Object.prototype.hasOwnProperty.call(result1 as unknown as object, "score")).toBe(
      false,
    );
    expect(
      Object.prototype.hasOwnProperty.call(
        result1 as unknown as object,
        "evaluatedRuleCodes",
      ),
    ).toBe(false);
  });

  test("Shape Guard: normalizationWarnings is always present and is an array", () => {
    const result = analyzeGovernance(payload);

    expect(result).toHaveProperty("normalizationWarnings");
    expect(
      Array.isArray(
        (result as unknown as { normalizationWarnings: unknown })
          .normalizationWarnings,
      ),
    ).toBe(true);
  });

  test("No-Mutation Guard: analyzeGovernance does not mutate the input payload", () => {
    const mutablePayload = deepClone(payload);
    const before = deepClone(mutablePayload);

    analyzeGovernance(mutablePayload);

    // Ensure input payload remains identical after analysis
    expect(mutablePayload).toEqual(before);
  });
});
