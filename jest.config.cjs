/** @type {import("jest").Config} */
module.exports = {
  clearMocks: true,
  testEnvironment: "node",
  roots: ["<rootDir>/tests", "<rootDir>/src"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  moduleNameMapper: {
    "^.+\\.module\\.css$": "<rootDir>/tests/mocks/css-module.ts",
    "^server-only$": "<rootDir>/tests/mocks/server-only.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
        },
      },
    ],
  },
};
