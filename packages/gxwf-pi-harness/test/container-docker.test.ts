import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RpcClient } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";

import {
  DEFAULT_CONTAINER_IMAGE,
  inspectContainerImage,
  type ContainerLaunchConfig,
} from "../src/index.js";

const enabled = process.env.FOUNDRY_TEST_CONTAINER === "1";

// Vitest 4 enforces `testTimeout` on synchronous tests, and this one never got a
// budget, so it inherits the 5s default. It boots a container and waits on
// planemo's startup inside it, which lands near that line — green on one runner
// and "Test timed out in 5000ms" on the next, for a run that completed fine.
// Applied as a wrapper rather than a third argument to `test`, because the third
// argument makes prettier reindent the whole body and buries the change.
const CONTAINER_TEST_TIMEOUT_MS = 120_000;

const testInContainer = (name: string, body: () => void): void =>
  test.skipIf(!enabled)(name, body, CONTAINER_TEST_TIMEOUT_MS);

testInContainer("the Docker worker cannot see checkout-only resources", () => {
  const root = mkdtempSync(path.join(tmpdir(), "foundry-pi-container-test-"));
  const checkout = path.join(root, "checkout");
  const skill = path.join(checkout, "casts", "claude", "skills", "example-skill");
  const stagedSkill = path.join(root, "run", "skill");
  const inputs = path.join(root, "inputs");
  const output = path.join(root, "output");
  mkdirSync(skill, { recursive: true });
  mkdirSync(path.join(checkout, ".git"));
  mkdirSync(path.join(checkout, "content", "molds"), { recursive: true });
  mkdirSync(path.join(checkout, "_emulated-runs"));
  mkdirSync(inputs);
  mkdirSync(output);
  writeFileSync(path.join(skill, "SKILL.md"), "---\nname: example-skill\n---\n");
  writeFileSync(path.join(inputs, "input.txt"), "declared\n");
  writeFileSync(
    path.join(inputs, "minimal-tool.xml"),
    [
      '<tool id="minimal" name="Minimal" version="1.0.0">',
      '  <command detect_errors="exit_code"><![CDATA[echo hello > "$output"]]></command>',
      "  <inputs />",
      '  <outputs><data name="output" format="txt" /></outputs>',
      "  <help><![CDATA[Test fixture.]]></help>",
      "</tool>",
      "",
    ].join("\n"),
  );
  cpSync(skill, stagedSkill, { recursive: true, dereference: true });

  const dockerBin = process.env.FOUNDRY_DOCKER_BIN ?? "docker";
  const user =
    typeof process.getuid === "function" && typeof process.getgid === "function"
      ? `${process.getuid()}:${process.getgid()}`
      : undefined;
  const image = inspectContainerImage(
    process.env.FOUNDRY_SANDBOX_IMAGE ?? DEFAULT_CONTAINER_IMAGE,
    dockerBin,
  );
  const script = [
    "test -f /skill/SKILL.md",
    "test -f /inputs/input.txt",
    "test ! -e /workspace/.git",
    "test ! -e /content/molds",
    "test ! -e /_emulated-runs",
    "foundry --help >/dev/null",
    "python3 --version >/dev/null",
    'test "$(planemo --version)" = "planemo, version 0.75.47"',
    "planemo lint --fail_level error /inputs/minimal-tool.xml >/dev/null",
    "! touch /skill/forbidden",
    "! touch /inputs/forbidden",
    "printf isolated > /workspace/probe.txt",
  ].join(" && ");
  const result = spawnSync(
    dockerBin,
    [
      "run",
      "--rm",
      "--pull=never",
      "--read-only",
      "--network=none",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      ...(user ? [`--user=${user}`] : []),
      "--mount",
      `type=bind,src=${stagedSkill},dst=/skill,readonly,bind-recursive=disabled`,
      "--mount",
      `type=bind,src=${inputs},dst=/inputs,readonly,bind-recursive=disabled`,
      "--mount",
      `type=bind,src=${output},dst=/workspace`,
      "--entrypoint",
      "bash",
      image.resolved_id,
      "-lc",
      script,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  expect(result.status, result.stderr).toBe(0);
  expect(readFileSync(path.join(output, "probe.txt"), "utf8")).toBe("isolated");
});

test.skipIf(!enabled)(
  "the Docker RPC worker discovers only the explicitly mounted skill",
  async () => {
    const root = mkdtempSync(path.join(tmpdir(), "foundry-pi-container-rpc-test-"));
    const skill = path.join(root, "skills", "example-skill");
    const unrelated = path.join(root, "skills", "unrelated-skill");
    const output = path.join(root, "output");
    mkdirSync(skill, { recursive: true });
    mkdirSync(unrelated);
    mkdirSync(output);
    writeFileSync(
      path.join(skill, "SKILL.md"),
      "---\nname: example-skill\ndescription: Container RPC fixture.\n---\n",
    );
    writeFileSync(
      path.join(unrelated, "SKILL.md"),
      "---\nname: unrelated-skill\ndescription: Must remain hidden.\n---\n",
    );

    const dockerBin = process.env.FOUNDRY_DOCKER_BIN ?? "docker";
    const image = inspectContainerImage(
      process.env.FOUNDRY_SANDBOX_IMAGE ?? DEFAULT_CONTAINER_IMAGE,
      dockerBin,
    );
    const config: ContainerLaunchConfig = {
      docker_bin: dockerBin,
      container_name: `foundry-pi-test-${process.pid}`,
      image_id: image.resolved_id,
      network: "none",
      credential_env: [],
      user:
        typeof process.getuid === "function" && typeof process.getgid === "function"
          ? `${process.getuid()}:${process.getgid()}`
          : undefined,
      mounts: [
        { type: "bind", source: skill, target: "/skill", read_only: true, purpose: "skill" },
        {
          type: "bind",
          source: output,
          target: "/workspace",
          read_only: false,
          purpose: "output",
        },
        {
          type: "tmpfs",
          target: "/pi-agent",
          read_only: false,
          purpose: "agent-config",
        },
        {
          type: "tmpfs",
          target: "/tmp",
          read_only: false,
          purpose: "temporary-files",
        },
      ],
    };
    const client = new RpcClient({
      cliPath: fileURLToPath(new URL("../dist/container-rpc-entry.js", import.meta.url)),
      cwd: output,
      env: { FOUNDRY_CONTAINER_LAUNCH_CONFIG: JSON.stringify(config) },
      args: [
        "--no-session",
        "--no-context-files",
        "--no-extensions",
        "--no-prompt-templates",
        "--no-skills",
        "--skill",
        "/skill",
      ],
    });

    try {
      await client.start();
      const skills = (await client.getCommands()).filter((command) => command.source === "skill");
      expect(skills.map((command) => command.name)).toEqual(["skill:example-skill"]);
    } finally {
      await client.stop();
    }
  },
  20_000,
);
