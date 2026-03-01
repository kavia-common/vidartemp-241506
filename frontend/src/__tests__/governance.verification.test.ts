import { analyzeGovernance } from "../analyzer";

function deepCloneJson<T>(value: T): T {
  // JSON-based deep clone is sufficient for this test payload (plain data only).
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Static adversarial payload literal.
 * Intentionally mixes snake_case & camelCase-ish shapes, odd types, and extra fields to exercise
 * normalization without relying on any network calls or mocks.
 */
const adversarialPayload = {
  system: {
    system_id: "sys-001",
    system_name: "Adversarial System",
    layer_id: "3", // string -> number
    sovereignty_level: " approved ", // trim + uppercase -> APPROVED
    zero_cloud_required: "true", // string -> boolean
    is_active: 1, // number -> boolean
    component_list: [
      {
        component_id: "c-001",
        component_name: "Component One",
        sovereignty_level: "restricted",
        product: {
          product_id: "p-001",
          canonical_name: "Product One",
          vendor_name: "Vendor A",
          vendor_country: "NO",
          sovereignty_level: "prohibited",
          zero_cloud_capable: "false",
          advisory_rule_codes: "PROD-ADVISORY-001", // string -> [string]
        },
      },
      {
        component_id: "c-002",
        component_name: "Component Two",
        sovereignty_level: "SOVEREIGN",
        product: null,
      },
      null,
      "not-an-object",
    ],
  },
  downstream_system_ids: ["ds-001", 2, null, "ds-003"], // mixed -> string[] filter
  extra_top_level: { nested: true },
} as const;

describe("analyzeGovernance verification hardening", () => {
  test("Determinism: same payload yields deep-equal results with stable ordering", () => {
    const result1 = analyzeGovernance(adversarialPayload);
    const result2 = analyzeGovernance(adversarialPayload);

    // Deep determinism (entire contract object)
    expect(result1).toEqual(result2);

    // Explicit ordering assertions (required by hardening phase)
    expect(result1.violations.map((v) => v.ruleCode)).toEqual(
      result2.violations.map((v) => v.ruleCode),
    );

    expect(result1.evaluatedRuleCodes).toEqual(result2.evaluatedRuleCodes);
  });

  test("Shape Guard: normalizationWarnings is always present and is an array", () => {
    const result = analyzeGovernance(adversarialPayload);

    expect(result).toHaveProperty("normalizationWarnings");
    expect(Array.isArray((result as unknown as { normalizationWarnings: unknown }).normalizationWarnings)).toBe(
      true,
    );
  });

  test("No-Mutation Guard: analyzeGovernance does not mutate the input payload", () => {
    const mutablePayload = deepCloneJson(adversarialPayload);
    const before = deepCloneJson(mutablePayload);

    analyzeGovernance(mutablePayload);

    // Ensure input payload remains identical after analysis
    expect(mutablePayload).toEqual(before);
  });
});
