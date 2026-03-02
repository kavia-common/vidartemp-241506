/* eslint-disable testing-library/no-node-access */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import api from "../api/client";
import * as ruleRegistry from "../engine/ruleRegistry";

import SystemExplorer from "./SystemExplorer";

// Mock the axios client used by SystemExplorer so no real network is performed.
jest.mock("../api/client", () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      interceptors: { request: { use: jest.fn() } },
    },
  };
});

/**
 * Extract all ruleCode strings rendered inside a given SystemListItem wrapper.
 *
 * @param {HTMLElement} wrapper
 * @returns {string[]}
 */
function getRenderedRuleCodes(wrapper) {
  const els = within(wrapper).queryAllByText(/^[A-Z0-9]+-\d{3}$/);
  return els.map((el) => (el.textContent ?? "").trim()).filter(Boolean);
}

/**
 * Find the wrapper element for a system row by using the system’s main selection button.
 *
 * @param {string} systemName
 * @returns {HTMLElement}
 */
function getSystemRowWrapper(systemName) {
  const mainButton = screen.getByRole("button", { name: new RegExp(systemName) });
  const wrapper = mainButton.parentElement;
  if (!wrapper) {
    throw new Error(`Could not find wrapper for system row: ${systemName}`);
  }
  return wrapper;
}

describe("SystemExplorer Rule Trace edge cases (spyOn registry)", () => {
  afterEach(() => {
    // Restore spyOn wrappers to keep tests isolated without resetting modules.
    jest.restoreAllMocks();

    // Ensure the API mock has no cross-test leakage.
    api.get.mockReset();
  });

  test("rule with multiple targetLayers appears for all matching layers and not for non-matching layers", async () => {
    // Create a controlled registry:
    // - MULTI-001 applies to layers 1 and 2
    // - L2-001 applies only to layer 2
    // - STR-001 applies to layer 1 but encodes its layer reference as a *string* ("1")
    const entries = [
      {
        ruleCode: "L2-001",
        description: "Layer 2 only",
        targetLayers: [2],
      },
      {
        ruleCode: "MULTI-001",
        description: "Multi-layer rule",
        targetLayers: [1, 2],
      },
      {
        ruleCode: "STR-001",
        description: "String layer targeting",
        targetLayers: ["1"],
      },
    ];

    // Mock ONLY listRuleMetadata() as requested (no module reset/isolation; no dynamic imports).
    jest.spyOn(ruleRegistry, "listRuleMetadata").mockReturnValue(Object.freeze(entries.slice()));

    const systems = [
      {
        system_id: "sys-a",
        system_name: "System A",
        layer_id: 1, // numeric
        sovereignty_level: "SOVEREIGN",
        is_active: true,
        zero_cloud_required: false,
      },
      {
        system_id: "sys-b",
        system_name: "System B",
        layer_id: 2,
        sovereignty_level: "APPROVED",
        is_active: true,
        zero_cloud_required: false,
      },
      {
        system_id: "sys-c",
        system_name: "System C",
        layer_id: 3,
        sovereignty_level: "CONDITIONAL",
        is_active: true,
        zero_cloud_required: false,
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === "/systems") {
        return Promise.resolve({ data: systems });
      }
      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    render(<SystemExplorer />);

    await screen.findByText("System A");
    await screen.findByText("System B");
    await screen.findByText("System C");

    // Layer 1 system: should include MULTI-001 and STR-001; must NOT include L2-001.
    const wrapperA = getSystemRowWrapper("System A");
    await user.click(within(wrapperA).getByLabelText(/toggle rule trace/i));
    await within(wrapperA).findByText("MULTI-001");
    await within(wrapperA).findByText("STR-001");
    expect(within(wrapperA).queryByText("L2-001")).toBeNull();

    const codesA = getRenderedRuleCodes(wrapperA);
    expect(codesA).toEqual([...codesA].sort((a, b) => a.localeCompare(b)));

    // Layer 2 system: should include MULTI-001 and L2-001; must NOT include STR-001.
    const wrapperB = getSystemRowWrapper("System B");
    await user.click(within(wrapperB).getByLabelText(/toggle rule trace/i));
    await within(wrapperB).findByText("MULTI-001");
    await within(wrapperB).findByText("L2-001");
    expect(within(wrapperB).queryByText("STR-001")).toBeNull();

    const codesB = getRenderedRuleCodes(wrapperB);
    expect(codesB).toEqual([...codesB].sort((a, b) => a.localeCompare(b)));

    // Layer 3 system: should have no rules.
    const wrapperC = getSystemRowWrapper("System C");
    await user.click(within(wrapperC).getByLabelText(/toggle rule trace/i));
    await within(wrapperC).findByText("No rules traced for this system.");
    expect(getRenderedRuleCodes(wrapperC)).toEqual([]);
  });

  test("mixed numeric/string layer_id normalization: system.layer_id=1 matches rule.targetLayers=['1'] deterministically", async () => {
    const entries = [
      {
        ruleCode: "STR-001",
        description: "String layer targeting",
        // Critical: string target layer
        targetLayers: ["1"],
      },
    ];

    jest.spyOn(ruleRegistry, "listRuleMetadata").mockReturnValue(Object.freeze(entries.slice()));

    const systems = [
      {
        system_id: "sys-a",
        system_name: "System A",
        layer_id: 1, // numeric
        sovereignty_level: "SOVEREIGN",
        is_active: true,
        zero_cloud_required: false,
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === "/systems") {
        return Promise.resolve({ data: systems });
      }
      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    render(<SystemExplorer />);

    await screen.findByText("System A");

    const wrapperA = getSystemRowWrapper("System A");
    await user.click(within(wrapperA).getByLabelText(/toggle rule trace/i));

    // Deterministic match should work across numeric/string representation.
    await within(wrapperA).findByText("STR-001");
    expect(getRenderedRuleCodes(wrapperA)).toContain("STR-001");
  });
});
