/**
 * CRACO configuration for the CRA frontend.
 *
 * Intentionally minimal: keep only the project's supported customizations
 * (currently just the webpack alias for `@` -> `src`).
 */
const path = require("path");

module.exports = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
};
