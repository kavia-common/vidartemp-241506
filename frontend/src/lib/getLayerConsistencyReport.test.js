import { getLayerConsistencyReport } from "./getLayerConsistencyReport";

describe("getLayerConsistencyReport", () => {
  it("marks a layer consistent when all systems share the same risk profile signature", () => {
    const systems = [
      {
        system_id: "a",
        system_name: "Alpha",
        layer_id: 1,
        rules: [{ severity: "CRITICAL" }, { severity: "WARNING" }],
      },
      {
        system_id: "b",
        system_name: "Beta",
        layer_id: 1,
        rules: [{ severity: "critical" }, { severity: "warning" }],
      },
      {
        system_id: "c",
        system_name: "Gamma",
        layer_id: 2,
        rules: [{ severity: "INFO" }],
      },
    ];

    const report = getLayerConsistencyReport(systems);

    expect(report.totals).toEqual({
      systemCount: 3,
      layerCount: 2,
      consistentLayerCount: 2,
      inconsistentLayerCount: 0,
    });

    const layer1 = report.layers.find(l => l.layerId === "1");
    expect(layer1).toBeTruthy();
    expect(layer1.isConsistent).toBe(true);
    expect(layer1.uniqueProfileCount).toBe(1);
    expect(layer1.referenceProfile).toEqual({
      totalRules: 2,
      criticalCount: 1,
      warningCount: 1,
      infoCount: 0,
    });
    expect(layer1.inconsistentSystems).toEqual([]);
  });

  it("marks a layer inconsistent and chooses a deterministic reference profile (majority, then signature)", () => {
    const systems = [
      // Layer 3: two systems share profile A, one system has profile B
      {
        system_id: "a",
        system_name: "Alpha",
        layer_id: 3,
        rules: [{ severity: "CRITICAL" }, { severity: "WARNING" }],
      },
      {
        system_id: "b",
        system_name: "Beta",
        layer_id: 3,
        rules: [{ severity: "critical" }, { severity: "warning" }],
      },
      {
        system_id: "c",
        system_name: "Gamma",
        layer_id: 3,
        rules: [{ severity: "INFO" }], // different signature
      },

      // Another layer to ensure grouping works
      {
        system_id: "d",
        system_name: "Delta",
        layer_id: 4,
        rules: [],
      },
    ];

    const report = getLayerConsistencyReport(systems);
    const layer3 = report.layers.find(l => l.layerId === "3");

    expect(layer3).toBeTruthy();
    expect(layer3.systemCount).toBe(3);
    expect(layer3.isConsistent).toBe(false);
    expect(layer3.uniqueProfileCount).toBe(2);

    // Majority profile: total=2, critical=1, warning=1, info=0 -> signature "2|1|1|0"
    expect(layer3.referenceSignature).toBe("2|1|1|0");
    expect(layer3.referenceProfile).toEqual({
      totalRules: 2,
      criticalCount: 1,
      warningCount: 1,
      infoCount: 0,
    });

    // Gamma should be flagged as inconsistent
    expect(layer3.inconsistentSystems).toEqual([
      { system_id: "c", system_name: "Gamma", signature: "1|0|0|1" },
    ]);

    // Totals sanity
    expect(report.totals.layerCount).toBe(2);
    expect(report.totals.inconsistentLayerCount).toBe(1);
    expect(report.totals.consistentLayerCount).toBe(1);
  });
});
