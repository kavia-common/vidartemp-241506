module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: { node: "current" },
      },
    ],
    [
      "@babel/preset-react",
      {
        runtime: "automatic",
      },
    ],
    // Needed because the repo contains .ts files and a .test.ts file.
    ["@babel/preset-typescript"],
  ],
};
