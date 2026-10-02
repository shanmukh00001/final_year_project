import type { Config } from "jest";

const swc: [string, Record<string, unknown>] = [
  "@swc/jest",
  {
    jsc: {
      parser: { syntax: "typescript", tsx: true },
      transform: { react: { runtime: "automatic" } },
    },
  },
];

const config: Config = {
  projects: [
    {
      displayName: "shared",
      testEnvironment: "node",
      rootDir: "packages/shared",
      testMatch: ["<rootDir>/src/**/*.test.ts"],
      transform: { "^.+\\.tsx?$": swc },
    },
    {
      displayName: "api",
      testEnvironment: "node",
      rootDir: "apps/api",
      testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/test/**/*.test.ts"],
      transform: { "^.+\\.[tj]sx?$": swc },
      transformIgnorePatterns: ["node_modules[\\\\/](?!(\\.pnpm|jose)[\\\\/])"],
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
      },
    },
    {
      displayName: "web",
      testEnvironment: "jsdom",
      rootDir: "apps/web",
      testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}", "<rootDir>/test/**/*.test.{ts,tsx}"],
      transform: { "^.+\\.tsx?$": swc },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "\\.css$": "<rootDir>/test/styleMock.ts",
        "^(\\.{1,2}/.*)\\.js$": "$1",
      },
    },
    {
      displayName: "engine",
      testEnvironment: "node",
      rootDir: ".",
      testMatch: ["<rootDir>/tests/engine/**/*.test.ts"],
      transform: { "^.+\\.tsx?$": swc },
    },
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/apps/web/dist",
    "<rootDir>/apps/api/dist",
    "<rootDir>/dist",
  ],
  testTimeout: 120_000,
};

export default config;
