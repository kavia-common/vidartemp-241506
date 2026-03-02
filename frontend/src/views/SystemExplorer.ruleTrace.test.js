/* eslint-disable testing-library/no-node-access */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

import api from "../api/client";
import SystemExplorer from "./SystemExplorer";

/**
 * Extract all ruleCode strings rendered inside a given SystemListItem wrapper.
 * The UI renders rule codes like `SOVR-001` / `COMP-001` / `CINT-001` as standalone
 * text nodes (not as labels).
 *
 * @param {HTMLElement} wrapper
 * @returns {string[]}
 */
function getRenderedRuleCodes(wrapper) {
  const els = within(wrapper).queryAllByText(/^(SOVR|COMP|CINT)-\d{3}$/);
  return els.map((el) => (el.textContent ?? "").trim()).filter(Boolean);
}

/**
 * Find the wrapper element for a system row by using the system’s main selection button.
 * Structure: wrapper DIV contains the main select <button> and the rule trace section.
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

describe("SystemExplorer Rule Trace differentiation", () => {
  test("shows layer-specific ruleCodes with no overlap and deterministic ordering by ruleCode", async () => {
    const systems = [
      {
        system_id: "sys-a",
        system_name: "System A",
        layer_id: 1,
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
        zero_cloud_required: true,
      },
    ];

    // Mock ONLY what SystemExplorer needs for this test: GET /systems.
    api.get.mockImplementation((url) => {
      if (url === "/systems") {
        return Promise.resolve({ data: systems });
      }
      // Defensive default (should not be hit for this test)
      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    render(<SystemExplorer />);

    // Wait for systems to render.
    await screen.findByText("System A");
    await screen.findByText("System B");
    await screen.findByText("System C");

    // Expand Rule Trace for each system and capture rule codes.
    const wrapperA = getSystemRowWrapper("System A");
    await user.click(within(wrapperA).getByLabelText(/toggle rule trace/i));
    await within(wrapperA).findByText("SOVR-001");
    const codesA = getRenderedRuleCodes(wrapperA);

    const wrapperB = getSystemRowWrapper("System B");
    await user.click(within(wrapperB).getByLabelText(/toggle rule trace/i));
    await within(wrapperB).findByText("COMP-001");
    const codesB = getRenderedRuleCodes(wrapperB);

    const wrapperC = getSystemRowWrapper("System C");
    await user.click(within(wrapperC).getByLabelText(/toggle rule trace/i));
    await within(wrapperC).findByText("CINT-001");
    const codesC = getRenderedRuleCodes(wrapperC);

    // Layer-specific rule family assertions
    expect(codesA.length).toBeGreaterThan(0);
    expect(codesA.every((c) => c.startsWith("SOVR-"))).toBe(true);

    expect(codesB.length).toBeGreaterThan(0);
    expect(codesB.every((c) => c.startsWith("COMP-"))).toBe(true);

    expect(codesC.length).toBeGreaterThan(0);
    expect(codesC.every((c) => c.startsWith("CINT-"))).toBe(true);

    // Deterministic alphabetical ordering by ruleCode (within each system’s trace)
    const sortAlpha = (arr) => [...arr].sort((a, b) => a.localeCompare(b));
    expect(codesA).toEqual(sortAlpha(codesA));
    expect(codesB).toEqual(sortAlpha(codesB));
    expect(codesC).toEqual(sortAlpha(codesC));

    // No overlap between rule sets
    const setA = new Set(codesA);
    const setB = new Set(codesB);
    const setC = new Set(codesC);

    const overlaps = (s1, s2) => [...s1].filter((x) => s2.has(x));

    expect(overlaps(setA, setB)).toEqual([]);
    expect(overlaps(setA, setC)).toEqual([]);
    expect(overlaps(setB, setC)).toEqual([]);
  });
});
