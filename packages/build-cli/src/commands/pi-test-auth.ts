import process from "node:process";

import {
  defaultPiTestAuthDir,
  PiTestAuthManager,
  type PiTestAuthLoginOptions,
  type PiTestAuthStatus,
} from "@galaxy-foundry/gxwf-pi-harness";

const USAGE =
  "usage: foundry-build pi-test-auth <login|status|logout> [--auth-dir <path>] [--method <browser|device-code>] [--no-open]";

export interface PiTestAuthCommandManager {
  login(options: PiTestAuthLoginOptions): Promise<PiTestAuthStatus>;
  logout(): Promise<void>;
  status(): PiTestAuthStatus;
}

export interface PiTestAuthCommandDependencies {
  createManager?: (authDir: string) => PiTestAuthCommandManager;
  write?: (text: string) => void;
}

function takeValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

export async function runPiTestAuthCommand(
  argv = process.argv.slice(2),
  dependencies: PiTestAuthCommandDependencies = {},
): Promise<void> {
  const action = argv[0];
  if (action !== "login" && action !== "status" && action !== "logout") {
    throw new Error(USAGE);
  }
  let authDir = defaultPiTestAuthDir();
  let method: PiTestAuthLoginOptions["loginMethod"] = "browser";
  let openBrowser = true;

  for (let i = 1; i < argv.length; i++) {
    const value = argv[i]!;
    if (value === "--auth-dir") authDir = takeValue(argv, i++, value);
    else if (value.startsWith("--auth-dir=")) authDir = value.slice("--auth-dir=".length);
    else if (value === "--method" || value.startsWith("--method=")) {
      const requested =
        value === "--method" ? takeValue(argv, i++, value) : value.slice("--method=".length);
      if (requested !== "browser" && requested !== "device-code") {
        throw new Error("--method must be browser or device-code");
      }
      method = requested === "device-code" ? "device_code" : "browser";
    } else if (value === "--no-open") openBrowser = false;
    else throw new Error(`unknown flag: ${value}\n${USAGE}`);
  }
  if (action !== "login" && (method !== "browser" || !openBrowser)) {
    throw new Error("--method and --no-open apply only to login");
  }

  const manager = (dependencies.createManager ?? ((dir) => new PiTestAuthManager(dir)))(authDir);
  let status: PiTestAuthStatus;
  if (action === "login") {
    status = await manager.login({ loginMethod: method, openBrowser });
  } else if (action === "logout") {
    await manager.logout();
    status = manager.status();
  } else {
    status = manager.status();
  }
  const write = dependencies.write ?? ((text: string) => process.stdout.write(text));
  write(`${JSON.stringify(status, null, 2)}\n`);
}
