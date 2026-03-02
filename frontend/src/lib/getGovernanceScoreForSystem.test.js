import { getGovernanceScoreForSystem } from "./getGovernanceScoreForSystem";

describe("getGovernanceScoreForSystem", () => {
  it("returns 100 (A) when there are no penalties", () => {
    const system = {
      rules: [],
      sovereignty_level: "SOVEREIGN",
      is_active: true,
      evaluation_history: [
        {
          timestamp: 1,
          risk_profile: { totalRules: 0, criticalCount: 0, warningCount: 0, infoCount: 0 },
        },
      ],
    };

    expect(getGovernanceScoreForSystem(system, { layerIsConsistent: true })).toEqual(
      expect.objectContaining({
        score: 100,
        grade: "A",
        penalties: {
          critical: 0,
          warning: 0,
          info: 0,
          drift: 0,
          layerInconsistency: 0,
          inactive: 0,
          sovereignty: 0,
        },
      })
    );
  });

  it("applies deterministic risk penalties based on severity counts", () => {
    const system = {
      rules: [
        { severity: "CRITICAL" },
        { severity: "critical" },
        { severity: "WARNING" },
        { severity: "info" },
        { severity: "informational" },
      ],
      sovereignty_level: "SOVEREIGN",
      is_active: true,
      evaluation_history: [],
    };

    // Risk profile: total=5, critical=2, warning=1, info=2
    // Penalties: 2*25 + 1*10 + 2*2 = 50 + 10 + 4 = 64 => score 36
    const res = getGovernanceScoreForSystem(system);

    expect(res.score).toBe(36);
    expect(res.grade).toBe("F");
    expect(res.penalties).toEqual(
      expect.objectContaining({
        critical: 50,
        warning: 10,
        info: 4,
        drift: 0,
      })
    );
  });

  it("applies drift penalty only when drift status is drifted (no-baseline is informational)", () => {
    const system = {
      // Derived current profile: total=1, critical=1, warning=0, info=0
      rules: [{ severity: "CRITICAL" }],
      sovereignty_level: "SOVEREIGN",
      is_active: true,
      evaluation_history: [
        {
          timestamp: 1,
          // Baseline differs: criticalCount 0 instead of 1 => drifted
          risk_profile: { totalRules: 1, criticalCount: 0, warningCount: 0, infoCount: 1 },
        },
      ],
    };

    // Risk penalties: critical 25
    // Drift penalty: 15
    // Total penalty: 40 => score 60 => grade D
    const res = getGovernanceScoreForSystem(system);

    expect(res.penalties.drift).toBe(15);
    expect(res.score).toBe(60);
    expect(res.grade).toBe("D");

    // No-baseline => no drift penalty
    const noBaselineRes = getGovernanceScoreForSystem({
      rules: [{ severity: "CRITICAL" }],
      evaluation_history: [],
    });

    expect(noBaselineRes.penalties.drift).toBe(0);
  });

  it("applies optional layer inconsistency penalty when provided", () => {
    const system = {
      rules: [],
      sovereignty_level: "SOVEREIGN",
      is_active: true,
      evaluation_history: [],
    };

    const consistent = getGovernanceScoreForSystem(system, { layerIsConsistent: true });
    const inconsistent = getGovernanceScoreForSystem(system, { layerIsConsistent: false });

    expect(consistent.score).toBe(100);
    expect(inconsistent.penalties.layerInconsistency).toBe(10);
    expect(inconsistent.score).toBe(90);
    expect(inconsistent.grade).toBe("A");
  });

  it("applies sovereignty and inactive penalties and clamps to [0..100]", () => {
    const system = {
      rules: [
        { severity: "CRITICAL" },
        { severity: "CRITICAL" },
        { severity: "CRITICAL" },
        { severity: "CRITICAL" },
        { severity: "CRITICAL" },
      ],
      sovereignty_level: "PROHIBITED",
      is_active: false,
      evaluation_history: [],
    };

    // Risk penalties: 5 * 25 = 125
    // Sovereignty: 50
    // Inactive: 5
    // Raw: 100 - 125 - 50 - 5 = -80 => clamp => 0
    const res = getGovernanceScoreForSystem(system);

    expect(res.rawScore).toBe(-80);
    expect(res.score).toBe(0);
    expect(res.grade).toBe("F");
  });

  it("returns N/A for invalid input", () => {
    const res = getGovernanceScoreForSystem(null);
    expect(res.score).toBe(0);
    expect(res.grade).toBe("N/A");
  });
});
