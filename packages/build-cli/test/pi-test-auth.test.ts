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

test("pi-test-auth accepts both spellings of every flag", async () => {
  const spaced = dependencies();
  await runPiTestAuthCommand(
    ["login", "--auth-dir", "/test/auth", "--method", "device-code"],
    spaced,
  );
  const inline = dependencies();
  await runPiTestAuthCommand(["login", "--auth-dir=/test/auth", "--method=device-code"], inline);

  expect(spaced.login).toHaveBeenCalledWith({ loginMethod: "device_code", openBrowser: true });
  expect(inline.login).toHaveBeenCalledWith({ loginMethod: "device_code", openBrowser: true });
});

test("pi-test-auth passes the parsed auth directory to the manager", async () => {
  const seen: string[] = [];
  const deps = dependencies();
  const base = deps.createManager!;
  deps.createManager = (dir) => {
    seen.push(dir);
    return base(dir);
  };
  await runPiTestAuthCommand(["status", "--auth-dir=/explicit/dir"], deps);
  await runPiTestAuthCommand(["status"], deps);

  expect(seen[0]).toBe("/explicit/dir");
  // No --auth-dir falls back to the harness default rather than an empty string.
  expect(seen[1]).toBeTruthy();
  expect(seen[1]).not.toBe("/explicit/dir");
});

test("pi-test-auth rejects flags that are missing their value", async () => {
  await expect(runPiTestAuthCommand(["login", "--auth-dir"], dependencies())).rejects.toThrow(
    "--auth-dir requires a value",
  );
  await expect(
    runPiTestAuthCommand(["login", "--auth-dir", "--method"], dependencies()),
  ).rejects.toThrow("--auth-dir requires a value");
  await expect(runPiTestAuthCommand(["login", "--method"], dependencies())).rejects.toThrow(
    "--method requires a value",
  );
});

test("pi-test-auth reports unknown flags with the usage line", async () => {
  await expect(runPiTestAuthCommand(["login", "--nope"], dependencies())).rejects.toThrow(
    "unknown flag: --nope",
  );
  // A near-miss must not be swallowed by the --auth-dir branch.
  await expect(runPiTestAuthCommand(["login", "--auth-dirs=/x"], dependencies())).rejects.toThrow(
    "unknown flag: --auth-dirs=/x",
  );
  await expect(runPiTestAuthCommand(["login", "--nope"], dependencies())).rejects.toThrow(
    "usage: foundry-build pi-test-auth",
  );
});

test("pi-test-auth keeps login-only flags off status and logout", async () => {
  await expect(
    runPiTestAuthCommand(["status", "--method=device-code"], dependencies()),
  ).rejects.toThrow("--method and --no-open apply only to login");
  await expect(runPiTestAuthCommand(["logout", "--no-open"], dependencies())).rejects.toThrow(
    "--method and --no-open apply only to login",
  );
});
