import { spawnSync } from "node:child_process";

import { VERSION as PI_VERSION } from "@earendil-works/pi-coding-agent";

export const FOUNDRY_CLI_VERSION = "0.1.0";
export const PLANEMO_VERSION = "0.75.47";
export const DEFAULT_CONTAINER_IMAGE = `galaxy-foundry/gxwf-pi-harness:pi-${PI_VERSION}-foundry-${FOUNDRY_CLI_VERSION}-planemo-${PLANEMO_VERSION}`;
export const CONTAINER_PI_VERSION_LABEL = "org.galaxyproject.foundry.pi-version";
export const CONTAINER_FOUNDRY_VERSION_LABEL = "org.galaxyproject.foundry.cli-version";
export const CONTAINER_PLANEMO_VERSION_LABEL = "org.galaxyproject.foundry.planemo-version";
export const CONTAINER_RPC_VERSION_LABEL = "org.galaxyproject.foundry.pi-rpc-version";
export const CONTAINER_RPC_VERSION = "1";

export type ContainerNetworkPolicy = "bridge" | "none";

export interface ContainerMount {
  type: "bind" | "tmpfs";
  source?: string;
  target: string;
  read_only: boolean;
  purpose: "skill" | "inputs" | "output" | "agent-config" | "temporary-files";
}

export interface ContainerImageResolution {
  requested: string;
  resolved_id: string;
  repo_digests: string[];
  pi_version: string;
  foundry_cli_version: string;
  planemo_version: string;
}

export interface ContainerLaunchConfig {
  docker_bin: string;
  container_name: string;
  image_id: string;
  network: ContainerNetworkPolicy;
  credential_env: string[];
  user?: string;
  mounts: ContainerMount[];
}

interface DockerImageInspect {
  Id?: unknown;
  RepoDigests?: unknown;
  Config?: { Labels?: Record<string, string> | null };
}

function dockerFailure(command: string[], stderr: string | null | undefined): Error {
  const detail = stderr?.trim();
  return new Error(
    `Docker ${command.join(" ")} failed${detail ? `: ${detail}` : ""}. ` +
      `Build the default image with "npm run gxwf-pi-harness:container-build" or supply --sandbox-image.`,
  );
}

export function inspectContainerImage(
  image: string,
  dockerBin = "docker",
): ContainerImageResolution {
  if (!image.trim()) throw new Error("container image must not be empty");
  const command = ["image", "inspect", image];
  const inspected = spawnSync(dockerBin, command, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (inspected.error) throw inspected.error;
  if (inspected.status !== 0) throw dockerFailure(command, inspected.stderr);
  const parsed = JSON.parse(inspected.stdout) as unknown;
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    throw new Error(`Docker returned an invalid image inspection for ${image}`);
  }
  const record = parsed[0] as DockerImageInspect;
  if (typeof record.Id !== "string" || !record.Id.startsWith("sha256:")) {
    throw new Error(`Docker image ${image} has no immutable sha256 image id`);
  }
  const labels = record.Config?.Labels ?? {};
  const imagePiVersion = labels?.[CONTAINER_PI_VERSION_LABEL];
  const foundryCliVersion = labels?.[CONTAINER_FOUNDRY_VERSION_LABEL];
  const planemoVersion = labels?.[CONTAINER_PLANEMO_VERSION_LABEL];
  const rpcVersion = labels?.[CONTAINER_RPC_VERSION_LABEL];
  if (
    imagePiVersion !== PI_VERSION ||
    foundryCliVersion !== FOUNDRY_CLI_VERSION ||
    planemoVersion !== PLANEMO_VERSION ||
    rpcVersion !== CONTAINER_RPC_VERSION
  ) {
    throw new Error(
      `Docker image ${image} is not a compatible Foundry Pi worker ` +
        `(expected Pi ${PI_VERSION}, Foundry CLI ${FOUNDRY_CLI_VERSION}, Planemo ${PLANEMO_VERSION}, ` +
        `and RPC contract ${CONTAINER_RPC_VERSION})`,
    );
  }
  return {
    requested: image,
    resolved_id: record.Id,
    repo_digests: Array.isArray(record.RepoDigests)
      ? record.RepoDigests.filter((value): value is string => typeof value === "string")
      : [],
    pi_version: imagePiVersion,
    foundry_cli_version: foundryCliVersion,
    planemo_version: planemoVersion,
  };
}

function bindMountArgument(mount: ContainerMount): string {
  if (!mount.source) throw new Error(`bind mount ${mount.target} has no source`);
  if (mount.source.includes(",")) {
    throw new Error(`Docker bind mount source cannot contain a comma: ${mount.source}`);
  }
  return [
    "type=bind",
    `src=${mount.source}`,
    `dst=${mount.target}`,
    ...(mount.read_only ? ["readonly", "bind-recursive=disabled"] : []),
  ].join(",");
}

function tmpfsArgument(mount: ContainerMount): string {
  const size = mount.purpose === "agent-config" ? "64m" : "128m";
  return `${mount.target}:rw,nosuid,nodev,size=${size},mode=1777`;
}

export function buildDockerRunArgs(config: ContainerLaunchConfig, piArgs: string[]): string[] {
  const args = [
    "run",
    "--rm",
    "--interactive",
    "--pull=never",
    "--name",
    config.container_name,
    "--init",
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--pids-limit=256",
    `--network=${config.network}`,
    "--workdir=/workspace",
  ];
  if (config.user) args.push(`--user=${config.user}`);
  for (const mount of config.mounts) {
    if (mount.type === "bind") args.push("--mount", bindMountArgument(mount));
    else args.push("--tmpfs", tmpfsArgument(mount));
  }
  args.push(
    "--env=HOME=/tmp",
    "--env=PI_CODING_AGENT_DIR=/pi-agent",
    "--env=PI_SKIP_VERSION_CHECK=1",
  );
  for (const name of config.credential_env) args.push("--env", name);
  args.push(config.image_id, ...piArgs);
  return args;
}
