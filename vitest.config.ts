import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // These are integration tests, not unit tests. Most of them either spawn `tsx` to run the
    // real CLI against a temp vault, or read every page the site build emitted — work measured
    // in seconds, against a default timeout of five. The suite passed only while the machine
    // was quiet; under load the failure surfaced in a different file each run, always as a
    // timeout and never as a wrong answer. A timeout that fires on a correct test reports a
    // busy laptop, not a defect.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@foundry/lib": new URL("./scripts/lib", import.meta.url).pathname,
    },
  },
});
