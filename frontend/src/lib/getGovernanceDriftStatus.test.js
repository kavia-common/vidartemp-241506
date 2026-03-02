import { getGovernanceDriftStatus } from "./getGovernanceDriftStatus";

describe("getGovernanceDriftStatus", () => {
  it("Current matches baseline → status = stable", () => {
    const system = {
      currentRiskProfile: {
        totalRules: 5,
        criticalCount: 1,
        warningCount: 2,
        infoCount: 2,
      },
      evaluation_history: [
        {
          timestamp: 100,
          totalRules: 1,
          criticalCount: 0,
          warningCount: 0,
          infoCount: 1,
        },
        {
          timestamp: 200, // most recent
          totalRules: 5,
          criticalCount: 1,
          warningCount: 2,
          infoCount: 2,
        },
      ],
    };

    expect(getGovernanceDriftStatus(system)).toEqual({
      status: "stable",
      baseline: {
        totalRules: 5,
        criticalCount: 1,
        warningCount: 2,
        infoCount: 2,
      },
    });
  });

  it("Current differs in at least one numeric field → status = drifted", () => {
    const system = {
      currentRiskProfile: {
        totalRules: 5,
        criticalCount: 1,
        warningCount: 3, // differs from baseline
        infoCount: 1,
      },
      evaluation_history: [
        {
          timestamp: 1,
          risk_profile: {
            totalRules: 5,
            criticalCount: 1,
            warningCount: 2,
            infoCount: 1,
          },
        },
      ],
    };

    expect(getGovernanceDriftStatus(system)).toEqual({
      status: "drifted",
      baseline: {
        totalRules: 5,
        criticalCount: 1,
        warningCount: 2,
        infoCount: 1,
      },
    });
  });

  it("No history → status = no-baseline", () => {
    const system = {
      currentRiskProfile: {
        totalRules: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
      evaluation_history: [],
    };

    expect(getGovernanceDriftStatus(system)).toEqual({
      status: "no-baseline",
      baseline: null,
    });
  });
});
