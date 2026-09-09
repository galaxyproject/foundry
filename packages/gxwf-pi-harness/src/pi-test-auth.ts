import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";

import { type AuthEvent, type AuthInteraction, type AuthPrompt } from "@earendil-works/pi-ai";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";

export const PI_TEST_AUTH_PROVIDER = "openai-codex";

export type PiTestAuthLoginMethod = "browser" | "device_code";

export interface PiTestAuthStatus {
  auth_dir: string;
  provider: typeof PI_TEST_AUTH_PROVIDER;
  configured: boolean;
  type?: "oauth" | "api_key";
  account_id?: string;
  expires_at?: string;
  problem?: string;
}

export interface PiTestAuthLoginOptions {
  loginMethod: PiTestAuthLoginMethod;
  openBrowser: boolean;
}

export interface PiTestAuthInteractionOptions extends PiTestAuthLoginOptions {
  write?: (message: string) => void;
  openExternal?: (url: string) => void;
  ask?: (prompt: AuthPrompt) => Promise<string>;
}

interface PiTestAuthRuntime {
  login(providerId: string, type: "oauth", interaction: AuthInteraction): Promise<unknown>;
  logout(providerId: string): Promise<void>;
}

interface PiTestAuthManagerDependencies {
  createRuntime?: (options: {
    authPath: string;
    refreshOnCreate: false;
  }) => Promise<PiTestAuthRuntime>;
}

export function defaultPiTestAuthDir(
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
): string {
  const configRoot =
    env.XDG_CONFIG_HOME && path.isAbsolute(env.XDG_CONFIG_HOME)
      ? env.XDG_CONFIG_HOME
      : path.join(home, ".config");
  return path.join(configRoot, "galaxy-foundry", "pi-test-auth");
}

export function piTestAuthPath(authDir = defaultPiTestAuthDir()): string {
  return path.join(path.resolve(authDir), "auth.json");
}

export function inspectPiTestAuth(authDir = defaultPiTestAuthDir()): PiTestAuthStatus {
  const resolvedAuthDir = path.resolve(authDir);
  const authPath = piTestAuthPath(resolvedAuthDir);
  if (!existsSync(authPath)) {
    return {
      auth_dir: resolvedAuthDir,
      provider: PI_TEST_AUTH_PROVIDER,
      configured: false,
    };
  }
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(authPath, "utf8"));
  } catch {
    return {
      auth_dir: resolvedAuthDir,
      provider: PI_TEST_AUTH_PROVIDER,
      configured: false,
      problem: "auth.json is unreadable or invalid JSON",
    };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      auth_dir: resolvedAuthDir,
      provider: PI_TEST_AUTH_PROVIDER,
      configured: false,
      problem: "invalid auth store: expected a JSON object",
    };
  }
  const credential = (data as Record<string, unknown>)[PI_TEST_AUTH_PROVIDER];
  if (!credential) {
    return {
      auth_dir: resolvedAuthDir,
      provider: PI_TEST_AUTH_PROVIDER,
      configured: false,
    };
  }
  if (typeof credential !== "object" || Array.isArray(credential)) {
    return {
      auth_dir: resolvedAuthDir,
      provider: PI_TEST_AUTH_PROVIDER,
      configured: false,
      problem: `invalid credential for ${PI_TEST_AUTH_PROVIDER}`,
    };
  }
  const fields = credential as Record<string, unknown>;
  if (fields.type !== "oauth") {
    return {
      auth_dir: resolvedAuthDir,
      provider: PI_TEST_AUTH_PROVIDER,
      configured: false,
      type: fields.type === "api_key" ? "api_key" : undefined,
      problem: `expected an OAuth credential for ${PI_TEST_AUTH_PROVIDER}`,
    };
  }
  if (
    typeof fields.access !== "string" ||
    typeof fields.refresh !== "string" ||
    typeof fields.expires !== "number" ||
    !Number.isFinite(fields.expires)
  ) {
    return {
      auth_dir: resolvedAuthDir,
      provider: PI_TEST_AUTH_PROVIDER,
      configured: false,
      type: "oauth",
      problem: `invalid OAuth credential for ${PI_TEST_AUTH_PROVIDER}`,
    };
  }
  return {
    auth_dir: resolvedAuthDir,
    provider: PI_TEST_AUTH_PROVIDER,
    configured: true,
    type: "oauth",
    account_id: typeof fields.accountId === "string" ? fields.accountId : undefined,
    expires_at: fields.expires > 0 ? new Date(fields.expires).toISOString() : undefined,
  };
}

function openBrowser(url: string): void {
  const command =
    process.platform === "darwin"
      ? { bin: "open", args: [url] }
      : process.platform === "win32"
        ? { bin: "cmd", args: ["/c", "start", "", url] }
        : { bin: "xdg-open", args: [url] };
  const child = spawn(command.bin, command.args, {
    detached: true,
    stdio: "ignore",
  });
  child.on("error", () => undefined);
  child.unref();
}

async function askInTerminal(prompt: AuthPrompt): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error(`${prompt.message}: interactive input requires a terminal`);
  }
  const terminal = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return await terminal.question(`${prompt.message} `, { signal: prompt.signal });
  } finally {
    terminal.close();
  }
}

export function createPiTestAuthInteraction(
  options: PiTestAuthInteractionOptions,
): AuthInteraction {
  const write = options.write ?? ((message) => process.stderr.write(`${message}\n`));
  const external = options.openExternal ?? openBrowser;
  const ask = options.ask ?? askInTerminal;
  return {
    async prompt(prompt): Promise<string> {
      if (prompt.type === "select") {
        const id = options.loginMethod;
        if (!prompt.options.some((option) => option.id === id)) {
          throw new Error(`Pi OAuth flow does not offer login method '${id}'`);
        }
        return id;
      }
      return ask(prompt);
    },
    notify(event: AuthEvent): void {
      if (event.type === "auth_url") {
        write(`Open this URL to authenticate:\n${event.url}`);
        if (event.instructions) write(event.instructions);
        if (options.openBrowser) external(event.url);
      } else if (event.type === "device_code") {
        write(`Open ${event.verificationUri} and enter code ${event.userCode}`);
        if (options.openBrowser) external(event.verificationUri);
      } else if (event.type === "info") {
        write(event.message);
        for (const link of event.links ?? [])
          write(`${link.label ?? "More information"}: ${link.url}`);
      } else {
        write(event.message);
      }
    },
  };
}

export class PiTestAuthManager {
  readonly authDir: string;
  private readonly createRuntime: NonNullable<PiTestAuthManagerDependencies["createRuntime"]>;

  constructor(authDir = defaultPiTestAuthDir(), dependencies: PiTestAuthManagerDependencies = {}) {
    this.authDir = path.resolve(authDir);
    this.createRuntime = dependencies.createRuntime ?? ((options) => ModelRuntime.create(options));
  }

  status(): PiTestAuthStatus {
    return inspectPiTestAuth(this.authDir);
  }

  async login(options: PiTestAuthLoginOptions): Promise<PiTestAuthStatus> {
    mkdirSync(this.authDir, { recursive: true, mode: 0o700 });
    const runtime = await this.createRuntime({
      authPath: piTestAuthPath(this.authDir),
      refreshOnCreate: false,
    });
    await runtime.login(PI_TEST_AUTH_PROVIDER, "oauth", createPiTestAuthInteraction(options));
    return this.status();
  }

  async logout(): Promise<void> {
    if (!existsSync(piTestAuthPath(this.authDir))) return;
    const runtime = await this.createRuntime({
      authPath: piTestAuthPath(this.authDir),
      refreshOnCreate: false,
    });
    await runtime.logout(PI_TEST_AUTH_PROVIDER);
  }
}
