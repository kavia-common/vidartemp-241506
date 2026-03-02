import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load all env vars from .env files so we can mirror CRA's REACT_APP_* injection.
  // NOTE: This is a build-time substitution (same model as CRA).
  const env = loadEnv(mode, process.cwd(), "");

  // Build a define map so existing `process.env.REACT_APP_*` references continue working
  // without requiring any changes in src/.
  const define = {
    // Many libs (and React itself) still reference process.env.NODE_ENV.
    "process.env.NODE_ENV": JSON.stringify(
      mode === "production" ? "production" : "development",
    ),
  };

  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("REACT_APP_")) {
      define[`process.env.${key}`] = JSON.stringify(value);
    }
  }

  const port = env.REACT_APP_PORT ? Number(env.REACT_APP_PORT) : 3000;

  return {
    plugins: [
      react(),
      svgr({
        // Support CRA-style SVG imports:
        //   import { ReactComponent as Logo } from "./logo.svg";
        svgrOptions: {
          exportType: "named",
        },
        include: "**/*.svg",
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    // Allow Vite env exposure for REACT_APP_* as well (even though src/ still uses process.env).
    envPrefix: ["VITE_", "REACT_APP_"],
    define,
    server: {
      port,
      strictPort: true,
    },
    preview: {
      port,
      strictPort: true,
    },
  };
});
