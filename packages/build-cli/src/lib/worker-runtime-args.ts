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

import { takeValue } from "./cli-args.js";

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
   * Consumes the token at `index` if it is a worker-runtime flag. Returns the last
   * argv index consumed -- assign it to the loop variable, as with {@link readOption}
   * -- or `null` so the caller can handle its own flags.
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

  // One row per runtime flag, so adding or renaming one touches a declaration rather
  // than two command parsers. Aliases share a setter. Maps, not object literals: an
  // object-literal lookup inherits `constructor`, `__proto__` and friends from
  // Object.prototype, which would mistake those positionals for known flags.
  const valueFlags = new Map<string, (value: string) => void>([
    ["--root", (value) => void (root = value)],
    ["--run-dir", (value) => void (runDir = value)],
    ["--provider", (value) => void (provider = value)],
    ["--model", (value) => void (model = value)],
    ["--thinking", (value) => void (thinking = parseThinking(value))],
    ["--timeout-seconds", (value) => void (timeoutMs = Number(value) * 1000)],
    ["--tools", (value) => void (tools = value.split(",").filter(Boolean))],
    ["--sandbox", (value) => void (sandbox = parseSandbox(value))],
    ["--sandbox-image", (value) => void (sandboxImage = value)],
    ["--sandbox-network", (value) => void (sandboxNetwork = parseSandboxNetwork(value))],
    ["--credential-env", (value) => void credentialEnv.push(value)],
    ["--auth-dir", (value) => void (piTestAuthDir = value)],
    ["--pi-test-auth-dir", (value) => void (piTestAuthDir = value)],
  ]);

  const booleanFlags = new Map<string, () => void>([
    ["--pi-test-auth", () => void (piTestAuth = true)],
  ]);

  return {
    consume(argv, index) {
      const token = argv[index]!;
      const setFlag = booleanFlags.get(token);
      if (setFlag) {
        setFlag();
        return index;
      }
      const separator = token.indexOf("=");
      const flag = separator > 0 ? token.slice(0, separator) : token;
      const setValue = valueFlags.get(flag);
      if (!setValue) return null;
      if (separator > 0) {
        setValue(token.slice(separator + 1));
        return index;
      }
      setValue(takeValue(argv, index, flag));
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
        // Resolved here, before `test-skill` chdirs into --root, so a relative
        // --auth-dir keeps pointing at the directory the user typed it from.
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
