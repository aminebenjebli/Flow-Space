import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/components/(.*)$": "<rootDir>/src/components/$1",
    "^@/lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@/store/(.*)$": "<rootDir>/store/$1",
    "^@/types/(.*)$": "<rootDir>/types/$1",
  },
  testMatch: [
    "<rootDir>/tests/**/*.test.{ts,tsx}",
    "<rootDir>/src/**/*.test.{ts,tsx}",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};

export default config;
