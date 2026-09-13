import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  defaultPiTestAuthDir,
  PI_TEST_AUTH_PROVIDER,
  type ContainerNetworkPolicy,
  type PiThinkingLevel,
  type SandboxMode,
} from "@galaxy-foundry/gxwf-pi-harness";

const THINKING_LEVELS = new Set<PiThinkingLevel>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Runtime flags shared by every worker command (`test-skill`, `test-pipeline`).
 *
 * `piTestAuthDir` is resolved to an absolute path when `--pi-test-auth` is set and
 * `null` otherwise; commands that model the disabled case as `undefined` convert on
 * the way out.
 */
export interface WorkerRuntimeArgs {
  root: string | null;
  runDir: string | null;
  provider: string;
  model: string;
  thinking?: PiThinkingLevel;
  timeoutMs: number;
  tools?: string[];
  sandbox: SandboxMode;
  sandboxImage?: string;
  sandboxNetwork: ContainerNetworkPolicy;
  credentialEnv: string[];
  piTestAuth: boolean;
  piTestAuthDir: string | null;
}

function takeValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

/**
 * Reads `--flag value` and `--flag=value` for one flag name.
 *
 * Returns the value plus the argv index the caller's loop should continue from, or
 * `null` when the current token is not that flag.
 */
export function readOption(
  argv: string[],
  index: number,
  flag: string,
): { value: string; index: number } | null {
  const token = argv[index]!;
  if (token === flag) return { value: takeValue(argv, index, flag), index: index + 1 };
  if (token.startsWith(`${flag}=`)) return { value: token.slice(flag.length + 1), index };
  return null;
}

export function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function parseThinking(value: string): PiThinkingLevel {
  if (!THINKING_LEVELS.has(value as PiThinkingLevel)) {
    throw new Error(`invalid --thinking value: ${value}`);
  }
  return value as PiThinkingLevel;
}

function parseSandbox(value: string): SandboxMode {
  if (value !== "local" && value !== "container") {
    throw new Error("--sandbox must be local or container");
  }
  return value;
}

function parseSandboxNetwork(value: string): ContainerNetworkPolicy {
  if (value !== "bridge" && value !== "none") {
    throw new Error("--sandbox-network must be bridge or none");
  }
  return value;
}

export interface WorkerRuntimeArgScanner {
  /**
   * Consumes the token at `index` if it is a worker-runtime flag. Returns the argv
   * index to continue from, or `null` so the caller can handle its own flags.
   */
  consume(argv: string[], index: number): number | null;
  /** Applies cross-flag validation and returns the runtime options. */
  finish(): WorkerRuntimeArgs;
}

export function createWorkerRuntimeArgScanner(): WorkerRuntimeArgScanner {
  let root: string | null = null;
  let runDir: string | null = null;
  let provider: string | null = null;
  let model: string | null = null;
  let thinking: PiThinkingLevel | undefined;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let tools: string[] | undefined;
  let sandbox: SandboxMode = "local";
  let sandboxImage: string | undefined;
  let sandboxNetwork: ContainerNetworkPolicy = "bridge";
  const credentialEnv: string[] = [];
  let piTestAuth = false;
  let piTestAuthDir: string | null = null;

  // One entry per value-taking runtime flag. Aliases share a setter, so adding or
  // renaming a flag touches this table rather than two command parsers.
  const setters: Record<string, (value: string) => void> = {
    "--root": (value) => void (root = value),
    "--run-dir": (value) => void (runDir = value),
    "--provider": (value) => void (provider = value),
    "--model": (value) => void (model = value),
    "--thinking": (value) => void (thinking = parseThinking(value)),
    "--timeout-seconds": (value) => void (timeoutMs = Number(value) * 1000),
    "--tools": (value) => void (tools = value.split(",").filter(Boolean)),
    "--sandbox": (value) => void (sandbox = parseSandbox(value)),
    "--sandbox-image": (value) => void (sandboxImage = value),
    "--sandbox-network": (value) => void (sandboxNetwork = parseSandboxNetwork(value)),
    "--credential-env": (value) => void credentialEnv.push(value),
    "--auth-dir": (value) => void (piTestAuthDir = value),
    "--pi-test-auth-dir": (value) => void (piTestAuthDir = value),
  };

  return {
    consume(argv, index) {
      const token = argv[index]!;
      if (token === "--pi-test-auth") {
        piTestAuth = true;
        return index;
      }
      const separator = token.indexOf("=");
      const flag = separator > 0 ? token.slice(0, separator) : token;
      const setter = setters[flag];
      if (!setter) return null;
      if (separator > 0) {
        setter(token.slice(separator + 1));
        return index;
      }
      setter(takeValue(argv, index, flag));
      return index + 1;
    },

    finish() {
      if (!provider) throw new Error("--provider is required so the worker runtime is pinned");
      if (!model) throw new Error("--model is required so the worker runtime is pinned");
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new Error("--timeout-seconds must be a positive number");
      }
      if (sandbox === "local" && (sandboxImage || credentialEnv.length)) {
        throw new Error("--sandbox-image and --credential-env require --sandbox container");
      }
      if (piTestAuth && sandbox !== "local") {
        throw new Error("--pi-test-auth requires --sandbox local");
      }
      if (piTestAuth && provider !== PI_TEST_AUTH_PROVIDER) {
        throw new Error(`--pi-test-auth requires --provider ${PI_TEST_AUTH_PROVIDER}`);
      }
      if (piTestAuthDir && !piTestAuth) {
        throw new Error("--auth-dir requires --pi-test-auth");
      }
      return {
        root,
        runDir,
        provider,
        model,
        thinking,
        timeoutMs,
        tools,
        sandbox,
        sandboxImage,
        sandboxNetwork,
        credentialEnv,
        piTestAuth,
        piTestAuthDir: piTestAuth ? path.resolve(piTestAuthDir ?? defaultPiTestAuthDir()) : null,
      };
    },
  };
}

export function defaultWorkerRunDir(
  prefix: string,
  label: string,
  now = new Date(),
  id: string = randomUUID(),
): string {
  const stamp = now.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return path.join(tmpdir(), `${prefix}-${label}-${stamp}-${id}`);
}
