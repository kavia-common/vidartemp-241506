import { getGovernanceScore } from "./getGovernanceScore";

describe("getGovernanceScore", () => {
  it("Stable system with no violations → score 100", () => {
    const system = { system_id: "s-1" };
    const riskProfile = { criticalCount: 0, warningCount: 0 };
    const driftStatus = "STABLE";

    expect(getGovernanceScore(system, riskProfile, driftStatus)).toBe(100);
  });

  it("System with critical + warning penalties", () => {
    const system = { system_id: "s-2" };
    const riskProfile = { criticalCount: 2, warningCount: 3 };
    const driftStatus = "STABLE";

    // 100 - (2*15) - (3*5) = 100 - 30 - 15 = 55
    expect(getGovernanceScore(system, riskProfile, driftStatus)).toBe(55);
  });

  it("Drift penalty applied", () => {
    const system = { system_id: "s-3" };
    const riskProfile = { criticalCount: 0, warningCount: 0 };

    expect(getGovernanceScore(system, riskProfile, "DRIFTED")).toBe(80);
    // Case-insensitive handling (call-sites may pass "drifted")
    expect(getGovernanceScore(system, riskProfile, "drifted")).toBe(80);
  });

  it("Score never negative (clamped)", () => {
    const system = { system_id: "s-4" };
    const riskProfile = { criticalCount: 10, warningCount: 10 };
    const driftStatus = "DRIFTED";

    // 100 - 150 - 50 - 20 = -120 => clamp to 0
    expect(getGovernanceScore(system, riskProfile, driftStatus)).toBe(0);
  });
});
