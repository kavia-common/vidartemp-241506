/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.(js|jsx|ts|tsx)",
    "<rootDir>/src/**/*.(spec|test).(js|jsx|ts|tsx)",
  ],
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",
  },
  transform: {
    "^.+\\.[tj]sx?$": "babel-jest",
  },
  // Some modern packages ship ESM; allow Babel to transform them for Jest.
  transformIgnorePatterns: [
    "/node_modules/(?!(react-router|react-router-dom|@remix-run|@radix-ui|lucide-react|sonner|cmdk|vaul|embla-carousel-react|next-themes)/)",
  ],
};
