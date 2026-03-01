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
  downstream_system_ids: ["SYS-2"],
} as const;

describe("analyzeGovernance verification hardening", () => {
  test("Determinism: same payload yields deep-equal results with stable ordering", () => {
    const result1 = analyzeGovernance(payload);
    const result2 = analyzeGovernance(payload);

    // Deep determinism (entire contract object)
    expect(result1).toEqual(result2);

    // Explicit ordering assertions (required by hardening phase)
    expect(result1.violations.map((v) => v.ruleCode)).toEqual(
      result2.violations.map((v) => v.ruleCode),
    );

    expect(result1.evaluatedRuleCodes).toEqual(result2.evaluatedRuleCodes);
  });

  test("Shape Guard: normalizationWarnings is always present and is an array", () => {
    const result = analyzeGovernance(payload);

    expect(result).toHaveProperty("normalizationWarnings");
    expect(
      Array.isArray(
        (result as unknown as { normalizationWarnings: unknown }).normalizationWarnings,
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
