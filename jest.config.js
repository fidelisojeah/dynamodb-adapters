module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  testTimeout: 15000,
  globalSetup: "./node_modules/@shelf/jest-dynamodb/setup.js",
  globalTeardown: "./node_modules/@shelf/jest-dynamodb/teardown.js"
};
