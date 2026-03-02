import { getRiskProfileForSystem } from "./getRiskProfileForSystem";

/**
 * PUBLIC_INTERFACE
 * getLayerConsistencyReport
 *
 * Deterministically computes a per-layer consistency report for systems' risk profiles.
 *
 * Definitions:
 * - "Risk profile" is derived via `getRiskProfileForSystem(system)` (rule-metadata based, deterministic).
 * - A layer is considered "consistent" if all systems in that layer share the same risk profile signature.
 *
 * Determinism guarantees:
 * - No randomness.
 * - No mutation of input arrays/objects.
 * - Stable tie-breaking when selecting a reference profile (majority count, then lexicographic signature).
 *
 * @param {Array<object>} systems - Array of system objects (expected to include `layer_id`, `system_id`, `system_name`).
 * @returns {{
 *   totals: {
 *     systemCount: number,
 *     layerCount: number,
 *     consistentLayerCount: number,
 *     inconsistentLayerCount: number
 *   },
 *   layers: Array<{
 *     layerId: string,
 *     systemCount: number,
 *     uniqueProfileCount: number,
 *     isConsistent: boolean,
 *     referenceSignature: string | null,
 *     referenceProfile: { totalRules: number, criticalCount: number, warningCount: number, infoCount: number } | null,
 *     variants: Array<{
 *       signature: string,
 *       count: number,
 *       profile: { totalRules: number, criticalCount: number, warningCount: number, infoCount: number },
 *       systems: Array<{ system_id: any, system_name: any }>
 *     }>,
 *     inconsistentSystems: Array<{ system_id: any, system_name: any, signature: string }>
 *   }>
 * }}
 */
export function getLayerConsistencyReport(systems) {
  const safeSystems = Array.isArray(systems) ? systems : [];

  /** @type {Map<string, Array<object>>} */
  const byLayer = new Map();

  for (const sys of safeSystems) {
    const rawLayer =
      sys?.layer_id ??
      sys?.layerId ??
      sys?.layer?.id ??
      sys?.layer?.layer_id ??
      null;

    const layerId = rawLayer === null || rawLayer === undefined || rawLayer === ""
      ? "unknown"
      : String(rawLayer);

    const list = byLayer.get(layerId);
    if (list) {
      list.push(sys);
    } else {
      byLayer.set(layerId, [sys]);
    }
  }

  const layerEntries = Array.from(byLayer.entries());

  // Sort layers deterministically: numeric-like IDs first by numeric value, then lexicographically.
  layerEntries.sort(([a], [b]) => {
    const aNum = /^[0-9]+$/.test(a) ? Number(a) : null;
    const bNum = /^[0-9]+$/.test(b) ? Number(b) : null;

    if (aNum !== null && bNum !== null) return aNum - bNum;
    if (aNum !== null) return -1;
    if (bNum !== null) return 1;
    return a.localeCompare(b);
  });

  const layers = layerEntries.map(([layerId, layerSystems]) => {
    /** @type {Map<string, { signature: string, profile: any, count: number, systems: Array<{system_id:any, system_name:any}> }>} */
    const variantMap = new Map();

    for (const sys of layerSystems) {
      const profile = getRiskProfileForSystem(sys);

      // Signature includes totalRules because unknown severities are ignored in buckets but still counted in totalRules.
      const signature = [
        profile.totalRules,
        profile.criticalCount,
        profile.warningCount,
        profile.infoCount,
      ].join("|");

      const existing = variantMap.get(signature);
      const sysRef = { system_id: sys?.system_id, system_name: sys?.system_name };

      if (existing) {
        existing.count += 1;
        existing.systems.push(sysRef);
      } else {
        variantMap.set(signature, {
          signature,
          profile,
          count: 1,
          systems: [sysRef],
        });
      }
    }

    const variants = Array.from(variantMap.values()).sort((va, vb) => {
      // Higher count first, then signature lexicographically for determinism.
      if (vb.count !== va.count) return vb.count - va.count;
      return va.signature.localeCompare(vb.signature);
    });

    const uniqueProfileCount = variants.length;
    const isConsistent = uniqueProfileCount <= 1;

    const reference = variants[0] ?? null;
    const referenceSignature = reference?.signature ?? null;
    const referenceProfile = reference?.profile ?? null;

    const inconsistentSystems = [];
    if (!isConsistent && referenceSignature) {
      for (const v of variants) {
        if (v.signature === referenceSignature) continue;
        for (const s of v.systems) {
          inconsistentSystems.push({
            system_id: s.system_id,
            system_name: s.system_name,
            signature: v.signature,
          });
        }
      }

      // Stable order for display/tests.
      inconsistentSystems.sort((a, b) => {
        const an = String(a.system_name ?? "");
        const bn = String(b.system_name ?? "");
        return an.localeCompare(bn);
      });
    }

    return {
      layerId,
      systemCount: layerSystems.length,
      uniqueProfileCount,
      isConsistent,
      referenceSignature,
      referenceProfile,
      variants: variants.map(v => ({
        signature: v.signature,
        count: v.count,
        profile: v.profile,
        systems: [...v.systems],
      })),
      inconsistentSystems,
    };
  });

  const consistentLayerCount = layers.filter(l => l.isConsistent).length;
  const inconsistentLayerCount = layers.length - consistentLayerCount;

  return {
    totals: {
      systemCount: safeSystems.length,
      layerCount: layers.length,
      consistentLayerCount,
      inconsistentLayerCount,
    },
    layers,
  };
}
