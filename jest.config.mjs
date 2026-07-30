export default {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/frontend/**/*.test.cjs"],
  setupFilesAfterEnv: ["<rootDir>/tests/frontend/setup.cjs"],
  collectCoverageFrom: ["apps/web/src/foundation-shell.cjs"],
  coverageThreshold: {
    global: { lines: 90, statements: 90, functions: 90, branches: 90 },
  },
};
