import process from "node:process";

import {
  defaultPiTestAuthDir,
  PiTestAuthManager,
  type PiTestAuthLoginOptions,
  type PiTestAuthStatus,
} from "@galaxy-foundry/gxwf-pi-harness";

import { readOption } from "../lib/cli-args.js";

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
    let option = readOption(argv, i, "--auth-dir");
    if (option) {
      authDir = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--method");
    if (option) {
      if (option.value !== "browser" && option.value !== "device-code") {
        throw new Error("--method must be browser or device-code");
      }
      method = option.value === "device-code" ? "device_code" : "browser";
      i = option.lastIndex;
      continue;
    }
    if (value === "--no-open") openBrowser = false;
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
