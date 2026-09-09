import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import {
  createPiTestAuthInteraction,
  defaultPiTestAuthDir,
  inspectPiTestAuth,
  PiTestAuthManager,
  piTestAuthPath,
} from "../src/index.js";

describe("pi-test-auth", () => {
  test("uses a Foundry-specific XDG configuration directory", () => {
    expect(defaultPiTestAuthDir({ XDG_CONFIG_HOME: "/config" }, "/home/alice")).toBe(
      "/config/galaxy-foundry/pi-test-auth",
    );
    expect(defaultPiTestAuthDir({}, "/home/alice")).toBe(
      "/home/alice/.config/galaxy-foundry/pi-test-auth",
    );
  });

  test("reports only non-secret credential metadata", () => {
    const root = mkdtempSync(path.join(tmpdir(), "foundry-pi-test-auth-"));
    mkdirSync(root, { recursive: true });
    writeFileSync(
      piTestAuthPath(root),
      JSON.stringify({
        "openai-codex": {
          type: "oauth",
          access: "access-secret-must-not-escape",
          refresh: "refresh-secret-must-not-escape",
          expires: Date.now() + 60_000,
          accountId: "account-123",
        },
      }),
      { mode: 0o600 },
    );

    const status = inspectPiTestAuth(root);
    expect(status).toEqual({
      auth_dir: root,
      provider: "openai-codex",
      configured: true,
      type: "oauth",
      account_id: "account-123",
      expires_at: expect.any(String),
    });
    expect(JSON.stringify(status)).not.toContain("access-secret");
    expect(JSON.stringify(status)).not.toContain("refresh-secret");
    expect(readFileSync(piTestAuthPath(root), "utf8")).toContain("access-secret");
  });

  test("reports a missing store without creating it", () => {
    const root = path.join(tmpdir(), `missing-pi-test-auth-${process.pid}-${Date.now()}`);
    expect(inspectPiTestAuth(root)).toEqual({
      auth_dir: root,
      provider: "openai-codex",
      configured: false,
    });
  });

  test("reports an incompatible or malformed store without throwing", () => {
    const root = mkdtempSync(path.join(tmpdir(), "foundry-pi-test-auth-invalid-"));
    writeFileSync(
      piTestAuthPath(root),
      JSON.stringify({ "openai-codex": { type: "api_key", key: "do-not-print" } }),
      { mode: 0o600 },
    );
    expect(inspectPiTestAuth(root)).toEqual({
      auth_dir: root,
      provider: "openai-codex",
      configured: false,
      type: "api_key",
      problem: "expected an OAuth credential for openai-codex",
    });

    writeFileSync(piTestAuthPath(root), "not-json", { mode: 0o600 });
    const malformed = inspectPiTestAuth(root);
    expect(malformed.configured).toBe(false);
    expect(malformed.problem).toMatch(/auth\.json/i);
    expect(JSON.stringify(malformed)).not.toContain("do-not-print");
  });

  test("adapts browser and device-code interactions without exposing credentials", async () => {
    const output: string[] = [];
    const opened: string[] = [];
    const interaction = createPiTestAuthInteraction({
      loginMethod: "device_code",
      openBrowser: true,
      write: (message) => output.push(message),
      openExternal: (url) => opened.push(url),
      ask: async () => "manual-result",
    });
    await expect(
      interaction.prompt({
        type: "select",
        message: "method",
        options: [
          { id: "browser", label: "Browser" },
          { id: "device_code", label: "Device" },
        ],
      }),
    ).resolves.toBe("device_code");
    await expect(interaction.prompt({ type: "manual_code", message: "code" })).resolves.toBe(
      "manual-result",
    );
    interaction.notify({
      type: "device_code",
      userCode: "ABCD-EFGH",
      verificationUri: "https://example.test/device",
    });
    expect(opened).toEqual(["https://example.test/device"]);
    expect(output.join("\n")).toContain("ABCD-EFGH");
  });

  test("delegates login and logout persistence to Pi's model runtime", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "foundry-pi-test-auth-manager-"));
    const login = vi.fn(async (provider, type, interaction) => {
      expect(provider).toBe("openai-codex");
      expect(type).toBe("oauth");
      await expect(
        interaction.prompt({
          type: "select",
          message: "method",
          options: [{ id: "browser", label: "Browser" }],
        }),
      ).resolves.toBe("browser");
      writeFileSync(
        piTestAuthPath(root),
        JSON.stringify({
          "openai-codex": {
            type: "oauth",
            access: "access-secret",
            refresh: "refresh-secret",
            expires: Date.now() + 60_000,
          },
        }),
        { mode: 0o600 },
      );
    });
    const logout = vi.fn(async () => writeFileSync(piTestAuthPath(root), "{}"));
    const createRuntime = vi.fn(async () => ({ login, logout }));
    const manager = new PiTestAuthManager(root, { createRuntime });

    await expect(manager.login({ loginMethod: "browser", openBrowser: false })).resolves.toEqual(
      expect.objectContaining({ configured: true, type: "oauth" }),
    );
    await manager.logout();
    expect(createRuntime).toHaveBeenCalledTimes(2);
    expect(createRuntime).toHaveBeenCalledWith({
      authPath: piTestAuthPath(root),
      refreshOnCreate: false,
    });
    expect(logout).toHaveBeenCalledWith("openai-codex");
    expect(manager.status().configured).toBe(false);
  });
});
