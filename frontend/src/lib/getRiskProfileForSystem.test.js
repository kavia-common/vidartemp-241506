import { getRiskProfileForSystem } from "./getRiskProfileForSystem";

describe("getRiskProfileForSystem", () => {
  it("counts CRITICAL/WARNING/INFO deterministically (case/whitespace tolerant, supports INFO synonyms)", () => {
    const system = {
      rules: [
        { severity: "critical" },
        { severity: "WARNING" },
        { severity: "info" },
        { severity: " informational " },
        { severity: "Information" },
      ],
    };

    expect(getRiskProfileForSystem(system)).toEqual({
      totalRules: 5,
      criticalCount: 1,
      warningCount: 1,
      infoCount: 3,
    });
  });

  it("ignores unknown/missing severities while still counting them in totalRules", () => {
    const system = {
      rule_trace: {
        rules: [
          { severity: "CRITICAL" },
          { severity: "unknown" },
          {},
          { severity: null },
          { severity: "warning" },
        ],
      },
    };

    expect(getRiskProfileForSystem(system)).toEqual({
      totalRules: 5,
      criticalCount: 1,
      warningCount: 1,
      infoCount: 0,
    });
  });
});
