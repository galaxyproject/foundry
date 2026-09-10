import { expect, test, vi } from "vitest";

import {
  runPiTestAuthCommand,
  type PiTestAuthCommandDependencies,
} from "../src/commands/pi-test-auth.js";

function dependencies(): PiTestAuthCommandDependencies & {
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  output: string[];
} {
  const output: string[] = [];
  const login = vi.fn(async () => ({
    auth_dir: "/test/auth",
    provider: "openai-codex" as const,
    configured: true as const,
    type: "oauth" as const,
    account_id: "account-123",
  }));
  const logout = vi.fn(async () => undefined);
  return {
    login,
    logout,
    output,
    createManager: () => ({
      login,
      logout,
      status: () => ({
        auth_dir: "/test/auth",
        provider: "openai-codex" as const,
        configured: true as const,
        type: "oauth" as const,
        account_id: "account-123",
      }),
    }),
    write: (text) => output.push(text),
  };
}

test("pi-test-auth login defaults to browser OAuth without printing credentials", async () => {
  const deps = dependencies();
  await runPiTestAuthCommand(["login", "--auth-dir", "/test/auth"], deps);

  expect(deps.login).toHaveBeenCalledWith({ loginMethod: "browser", openBrowser: true });
  expect(deps.output.join("")).toContain('"provider": "openai-codex"');
  expect(deps.output.join("")).not.toMatch(/access|refresh|token/i);
});

test("pi-test-auth accepts headless device-code login", async () => {
  const deps = dependencies();
  await runPiTestAuthCommand(["login", "--method", "device-code", "--no-open"], deps);

  expect(deps.login).toHaveBeenCalledWith({ loginMethod: "device_code", openBrowser: false });
});

test("pi-test-auth status and logout use the isolated store", async () => {
  const deps = dependencies();
  await runPiTestAuthCommand(["status"], deps);
  await runPiTestAuthCommand(["logout"], deps);

  expect(deps.logout).toHaveBeenCalledOnce();
  expect(deps.output.join("")).toContain('"configured": true');
});

test("pi-test-auth rejects unknown actions and methods", async () => {
  await expect(runPiTestAuthCommand(["wat"], dependencies())).rejects.toThrow(
    "usage: foundry-build pi-test-auth",
  );
  await expect(
    runPiTestAuthCommand(["login", "--method", "telepathy"], dependencies()),
  ).rejects.toThrow("--method must be browser or device-code");
});
