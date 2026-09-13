import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  expectedArtifactsFromSkill,
  inspectPiTestAuth,
  PI_TEST_AUTH_PROVIDER,
  runPiSkill,
  sha256Path,
  type ArtifactResult,
  type ContainerNetworkPolicy,
  type ExpectedArtifact,
  type PiSkillRunRecord,
  type PiThinkingLevel,
  type RunPiSkillOptions,
  type RunStatus,
  type SandboxMode,
} from "@galaxy-foundry/gxwf-pi-harness";
import type { ProvenanceArtifactInput } from "../lib/artifact-contract.js";
import { readMarkdown } from "../lib/frontmatter.js";
import { parseScenarioCases, resolveScenarioFixture } from "../lib/scenarios.js";
import {
  createWorkerRuntimeArgScanner,
  defaultWorkerRunDir,
  parsePositiveInteger,
  readOption,
} from "../lib/worker-runtime-args.js";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface AssemblyPhase {
  phase: number;
  kind: string;
  skill?: string;
  loop?: boolean;
  cast_present?: boolean | Array<boolean | null>;
}

interface AssemblyManifest {
  source_pipeline: string;
  source_revision: number;
  harness_name: string;
  phases: AssemblyPhase[];
}

interface ProvenanceManifest {
  artifacts?: {
    consumes?: Partial<ProvenanceArtifactInput>[];
  };
}

export interface TestPipelineOptions {
  repoRoot: string;
  pipeline: string;
  scenario: string;
  through?: string;
  trials: number;
  runDir: string;
  provider: string;
  model: string;
  thinking?: PiThinkingLevel;
  timeoutMs: number;
  tools?: string[];
  sandbox: SandboxMode;
  sandboxImage?: string;
  sandboxNetwork: ContainerNetworkPolicy;
  credentialEnv: string[];
  piTestAuthDir?: string;
}

interface ResolvedScenario {
  name: string;
  source_path: string;
  fixture_path: string;
  fixture_sha256: string;
}

interface PromotedArtifact {
  id: string;
  path: string;
  sha256: string;
  producer_phase: number;
}

interface PromotedArtifactState {
  record: PromotedArtifact;
  absolutePath: string;
}

export interface PipelinePhaseRunRecord {
  phase: number;
  skill: string;
  status: RunStatus;
  failure_kind?: "worker" | "artifact_promotion";
  error?: string;
  run_dir: string;
  worker_run_id?: string;
  worker_run_path?: string;
  trace_path?: string;
  stderr_path?: string;
  declared_input_ids: string[];
  resolved_inputs: PromotedArtifact[];
  missing_input_ids: string[];
  artifacts: ArtifactResult[];
  usage?: PiSkillRunRecord["usage"];
}

export interface PipelineTrialRunRecord {
  trial: number;
  status: RunStatus;
  phases: PipelinePhaseRunRecord[];
}

export interface PipelineRunRecord {
  pipeline_run_schema_version: 1;
  run_id: string;
  status: RunStatus;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  pipeline: string;
  source_revision: number;
  harness_name: string;
  assembly_path: string;
  assembly_sha256: string;
  through_phase: number;
  scenario: ResolvedScenario;
  engine: {
    name: "pi";
    provider: string;
    model: string;
    thinking?: PiThinkingLevel;
  };
  sandbox: {
    mode: SandboxMode;
    image?: string;
    network_policy: ContainerNetworkPolicy | "host";
    credential_env: string[];
    credential_auth_store: "pi-test-auth" | "none";
  };
  trials: PipelineTrialRunRecord[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    total_tokens: number;
    cost: number;
    turns: number;
    tool_calls: number;
  };
}

export interface PipelineRunnerDependencies {
  runSkill?: (options: RunPiSkillOptions) => Promise<PiSkillRunRecord>;
  now?: () => Date;
  id?: () => string;
}

export interface TestPipelineCliArgs extends Omit<TestPipelineOptions, "repoRoot" | "runDir"> {
  root: string | null;
  runDir: string | null;
}

export function parseTestPipelineArgs(argv: string[]): TestPipelineCliArgs {
  const runtime = createWorkerRuntimeArgScanner();
  const positional: string[] = [];
  let scenario: string | null = null;
  let through: string | undefined;
  let trials = 1;

  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]!;
    let option = readOption(argv, i, "--scenario");
    if (option) {
      scenario = option.value;
      i = option.index;
      continue;
    }
    option = readOption(argv, i, "--through");
    if (option) {
      through = option.value;
      i = option.index;
      continue;
    }
    option = readOption(argv, i, "--trials");
    if (option) {
      trials = parsePositiveInteger(option.value, "--trials");
      i = option.index;
      continue;
    }
    option = readOption(argv, i, "--engine");
    if (option) {
      if (option.value !== "pi") throw new Error("--engine currently supports only pi");
      i = option.index;
      continue;
    }
    const consumed = runtime.consume(argv, i);
    if (consumed !== null) {
      i = consumed;
      continue;
    }
    if (!value.startsWith("--")) positional.push(value);
    else throw new Error(`unknown flag: ${value}`);
  }

  if (positional.length !== 1) {
    throw new Error(
      "usage: foundry-build test-pipeline <pipeline> --scenario <name> --provider <provider> --model <model> [options]",
    );
  }
  if (!scenario) throw new Error("--scenario is required");

  const { piTestAuth, piTestAuthDir, ...options } = runtime.finish();
  return {
    ...options,
    pipeline: positional[0]!,
    scenario,
    through,
    trials,
    piTestAuthDir: piTestAuth ? (piTestAuthDir ?? undefined) : undefined,
  };
}

export function defaultTestPipelineRunDir(pipeline: string, now?: Date, id?: string): string {
  return defaultWorkerRunDir("foundry-pi-pipeline-run", pipeline, now, id);
}

function loadAssembly(repoRoot: string, pipeline: string): AssemblyManifest {
  if (!SLUG.test(pipeline)) throw new Error(`invalid pipeline slug: ${pipeline}`);
  const assemblyPath = path.join(
    repoRoot,
    "casts",
    "claude",
    "skills",
    `pipeline-${pipeline}`,
    "_assembly.json",
  );
  if (!existsSync(assemblyPath)) throw new Error(`pipeline assembly not found: ${assemblyPath}`);
  const manifest = JSON.parse(readFileSync(assemblyPath, "utf8")) as Partial<AssemblyManifest>;
  if (
    manifest.source_pipeline !== pipeline ||
    typeof manifest.source_revision !== "number" ||
    typeof manifest.harness_name !== "string" ||
    !Array.isArray(manifest.phases)
  ) {
    throw new Error(`${assemblyPath}: invalid pipeline assembly`);
  }
  return manifest as AssemblyManifest;
}

function selectLinearPhases(manifest: AssemblyManifest, through?: string): AssemblyPhase[] {
  let throughIndex = manifest.phases.length;
  if (through !== undefined) {
    if (/^[1-9][0-9]*$/.test(through)) {
      const phaseNumber = Number(through);
      const index = manifest.phases.findIndex((phase) => phase.phase === phaseNumber);
      if (index < 0) throw new Error(`--through phase not found: ${through}`);
      throughIndex = index + 1;
    } else {
      const matches = manifest.phases
        .map((phase, index) => ({ phase, index }))
        .filter(({ phase }) => phase.skill === through);
      if (matches.length !== 1) throw new Error(`--through skill must match one phase: ${through}`);
      throughIndex = matches[0]!.index + 1;
    }
  }

  const selected = manifest.phases.slice(0, throughIndex);
  if (!selected.length) throw new Error("pipeline assembly has no phases");
  const phaseNumbers = new Set<number>();
  for (const phase of selected) {
    if (!Number.isSafeInteger(phase.phase) || phase.phase < 1) {
      throw new Error("pipeline assembly contains an invalid phase number");
    }
    if (phaseNumbers.has(phase.phase)) {
      throw new Error(`pipeline assembly repeats phase number ${phase.phase}`);
    }
    phaseNumbers.add(phase.phase);
    if (phase.kind !== "mold") {
      throw new Error(
        `phase ${phase.phase} uses unsupported ${phase.kind} control flow; select an earlier --through phase`,
      );
    }
    if (phase.loop) {
      throw new Error(
        `phase ${phase.phase} uses unsupported loop control flow; select an earlier --through phase`,
      );
    }
    if (phase.cast_present !== true) {
      throw new Error(`phase ${phase.phase} does not have a cast skill`);
    }
    if (!phase.skill || !SLUG.test(phase.skill)) {
      throw new Error(`phase ${phase.phase} has an invalid skill name`);
    }
  }
  return selected;
}

function resolveScenario(repoRoot: string, pipeline: string, name: string): ResolvedScenario {
  const scenarioPath = path.join(repoRoot, "content", "pipelines", pipeline, "scenarios.md");
  if (!existsSync(scenarioPath)) throw new Error(`pipeline scenarios not found: ${scenarioPath}`);
  const matches = parseScenarioCases(readMarkdown(scenarioPath).body).filter(
    (scenario) => scenario.name === name,
  );
  if (matches.length === 0) throw new Error(`scenario not found for ${pipeline}: ${name}`);
  if (matches.length > 1) throw new Error(`scenario must match exactly one case: ${name}`);
  const fixture = matches[0]!.fixturePath;
  if (!fixture) throw new Error(`scenario '${name}' does not declare a fixture`);
  const resolution = resolveScenarioFixture(repoRoot, scenarioPath, fixture);
  if (!resolution.materialized) {
    throw new Error(`scenario fixture is not materialized: ${fixture}`);
  }
  return {
    name,
    source_path: path.relative(repoRoot, scenarioPath).split(path.sep).join("/"),
    fixture_path: resolution.repositoryPath,
    fixture_sha256: sha256Path(resolution.absolutePath),
  };
}

function consumedArtifactIds(skillDir: string): string[] {
  const provenancePath = path.join(skillDir, "_provenance.json");
  if (!existsSync(provenancePath)) return [];
  const manifest = JSON.parse(readFileSync(provenancePath, "utf8")) as ProvenanceManifest;
  const consumes = manifest.artifacts?.consumes ?? [];
  return consumes.map((artifact, index) => {
    if (typeof artifact.id !== "string" || !SLUG.test(artifact.id)) {
      throw new Error(`${provenancePath}: artifacts.consumes[${index}] has an invalid id`);
    }
    return artifact.id;
  });
}

function phasePrompt(
  pipeline: string,
  scenario: string,
  phase: AssemblyPhase,
  hasScenarioInput: boolean,
  resolvedInputs: PromotedArtifact[],
  missingInputIds: string[],
): string {
  const lines = [
    `Execute phase ${phase.phase} (${phase.skill}) of Pipeline '${pipeline}' for scenario '${scenario}'.`,
    "Use only the staged declared inputs. Write every declared output at its exact default filename in the worker workspace.",
  ];
  if (hasScenarioInput) {
    lines.push("The first staged declared input is the scenario fixture.");
  }
  if (resolvedInputs.length) {
    lines.push("Declared artifact inputs:", ...resolvedInputs.map((input) => `- ${input.id}`));
  }
  if (missingInputIds.length) {
    lines.push(
      `No prior phase produced these declared artifact IDs: ${missingInputIds.join(", ")}. Treat them as absent only where the skill contract permits an initial empty value.`,
    );
  }
  return lines.join("\n");
}

function preflightInputBasenames(
  phasePlans: Array<{
    phase: AssemblyPhase;
    consumes: string[];
    produces: ExpectedArtifact[];
  }>,
  fixturePath: string,
): void {
  const available = new Map<string, string>();
  phasePlans.forEach((plan, index) => {
    const basenames = [
      ...(index === 0 ? [path.basename(realpathSync(fixturePath))] : []),
      ...plan.consumes.flatMap((id) => {
        const producedPath = available.get(id);
        return producedPath ? [path.basename(producedPath)] : [];
      }),
    ];
    const seen = new Set<string>();
    for (const basename of basenames) {
      if (seen.has(basename)) {
        throw new Error(
          `phase ${plan.phase.phase} declared inputs share staged basename '${basename}'`,
        );
      }
      seen.add(basename);
    }
    for (const produced of plan.produces) available.set(produced.id, produced.path);
  });
}

function emptyUsage(): PipelineRunRecord["usage"] {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    total_tokens: 0,
    cost: 0,
    turns: 0,
    tool_calls: 0,
  };
}

function addUsage(total: PipelineRunRecord["usage"], usage: PiSkillRunRecord["usage"]): void {
  if (!usage) return;
  total.input_tokens += usage.input_tokens;
  total.output_tokens += usage.output_tokens;
  total.cache_read_tokens += usage.cache_read_tokens;
  total.cache_write_tokens += usage.cache_write_tokens;
  total.total_tokens += usage.total_tokens;
  total.cost += usage.cost;
  total.turns += usage.turns;
  total.tool_calls += usage.tool_calls;
}

function combinedStatus(statuses: RunStatus[]): RunStatus {
  if (statuses.every((status) => status === "passed")) return "passed";
  for (const status of ["error", "timed_out", "cancelled", "failed"] as const) {
    if (statuses.includes(status)) return status;
  }
  return "failed";
}

function writePipelineRecord(runDir: string, record: PipelineRunRecord): void {
  writeFileSync(path.join(runDir, "run.json"), `${JSON.stringify(record, null, 2)}\n`);
}

export async function runLinearPipeline(
  options: TestPipelineOptions,
  dependencies: PipelineRunnerDependencies = {},
): Promise<PipelineRunRecord> {
  const now = dependencies.now ?? (() => new Date());
  const id = dependencies.id ?? randomUUID;
  const runner = dependencies.runSkill ?? runPiSkill;
  const repoRoot = path.resolve(options.repoRoot);
  const runDir = path.resolve(options.runDir);
  if (existsSync(runDir)) throw new Error(`run directory already exists: ${runDir}`);
  if (!Number.isSafeInteger(options.trials) || options.trials < 1) {
    throw new Error("trials must be a positive integer");
  }
  if (options.sandbox === "local" && (options.sandboxImage || options.credentialEnv.length)) {
    throw new Error("container image and credential options require sandbox=container");
  }
  if (options.piTestAuthDir && options.sandbox !== "local") {
    throw new Error("pi-test-auth requires sandbox=local");
  }
  if (options.piTestAuthDir && options.provider !== PI_TEST_AUTH_PROVIDER) {
    throw new Error(`pi-test-auth requires provider=${PI_TEST_AUTH_PROVIDER}`);
  }
  if (options.piTestAuthDir && !inspectPiTestAuth(options.piTestAuthDir).configured) {
    throw new Error("pi-test-auth is not configured; run foundry-build pi-test-auth login first");
  }

  const assembly = loadAssembly(repoRoot, options.pipeline);
  const assemblyPath = path.join(
    repoRoot,
    "casts",
    "claude",
    "skills",
    `pipeline-${options.pipeline}`,
    "_assembly.json",
  );
  const phases = selectLinearPhases(assembly, options.through);
  const scenario = resolveScenario(repoRoot, options.pipeline, options.scenario);
  const fixturePath = path.resolve(repoRoot, scenario.fixture_path);
  const phasePlans = phases.map((phase) => {
    const skillDir = path.join(repoRoot, "casts", "claude", "skills", phase.skill!);
    if (!existsSync(skillDir)) throw new Error(`cast skill not found: ${skillDir}`);
    return {
      phase,
      skillDir,
      consumes: consumedArtifactIds(skillDir),
      produces: expectedArtifactsFromSkill(skillDir),
    };
  });
  preflightInputBasenames(phasePlans, fixturePath);
  const started = now();
  const record: PipelineRunRecord = {
    pipeline_run_schema_version: 1,
    run_id: id(),
    status: "passed",
    started_at: started.toISOString(),
    finished_at: started.toISOString(),
    duration_ms: 0,
    pipeline: options.pipeline,
    source_revision: assembly.source_revision,
    harness_name: assembly.harness_name,
    assembly_path: path.relative(repoRoot, assemblyPath).split(path.sep).join("/"),
    assembly_sha256: sha256Path(assemblyPath),
    through_phase: phases.at(-1)!.phase,
    scenario,
    engine: {
      name: "pi",
      provider: options.provider,
      model: options.model,
      thinking: options.thinking,
    },
    sandbox: {
      mode: options.sandbox,
      image: options.sandboxImage,
      network_policy: options.sandbox === "container" ? options.sandboxNetwork : "host",
      credential_env: [...options.credentialEnv].sort(),
      credential_auth_store: options.piTestAuthDir ? "pi-test-auth" : "none",
    },
    trials: [],
    usage: emptyUsage(),
  };
  mkdirSync(runDir, { recursive: true, mode: 0o700 });

  for (let trialNumber = 1; trialNumber <= options.trials; trialNumber++) {
    const trialDir = path.join(runDir, `trial-${String(trialNumber).padStart(3, "0")}`);
    mkdirSync(trialDir);
    const promoted = new Map<string, PromotedArtifactState>();
    const trial: PipelineTrialRunRecord = { trial: trialNumber, status: "passed", phases: [] };

    for (const plan of phasePlans) {
      const phase = plan.phase;
      const phaseRunDir = path.join(
        trialDir,
        `phase-${String(phase.phase).padStart(3, "0")}-${phase.skill}`,
      );
      const resolvedInputs = plan.consumes.flatMap((artifactId) => {
        const artifact = promoted.get(artifactId);
        return artifact ? [artifact.record] : [];
      });
      const missingInputIds = plan.consumes.filter((artifactId) => !promoted.has(artifactId));
      const scenarioInput = plan === phasePlans[0] ? fixturePath : null;
      const inputPaths = [
        ...(scenarioInput ? [scenarioInput] : []),
        ...plan.consumes.flatMap((artifactId) => {
          const artifact = promoted.get(artifactId);
          return artifact ? [artifact.absolutePath] : [];
        }),
      ];

      let worker: PiSkillRunRecord;
      try {
        worker = await runner({
          skillDir: plan.skillDir,
          prompt: phasePrompt(
            options.pipeline,
            options.scenario,
            phase,
            scenarioInput !== null,
            resolvedInputs,
            missingInputIds,
          ),
          inputPaths,
          expectedArtifacts: plan.produces,
          runDir: phaseRunDir,
          provider: options.provider,
          model: options.model,
          thinking: options.thinking,
          timeoutMs: options.timeoutMs,
          tools: options.tools,
          sandbox: options.sandbox,
          sandboxImage: options.sandboxImage,
          sandboxNetwork: options.sandboxNetwork,
          credentialEnv: options.credentialEnv,
          piTestAuthDir: options.piTestAuthDir,
        });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        trial.phases.push({
          phase: phase.phase,
          skill: phase.skill!,
          status: "error",
          error: message,
          run_dir: path.relative(runDir, phaseRunDir).split(path.sep).join("/"),
          declared_input_ids: plan.consumes,
          resolved_inputs: resolvedInputs,
          missing_input_ids: missingInputIds,
          artifacts: [],
        });
        trial.status = "error";
        break;
      }

      addUsage(record.usage, worker.usage);
      const phaseRecord: PipelinePhaseRunRecord = {
        phase: phase.phase,
        skill: phase.skill!,
        status: worker.status,
        failure_kind: worker.status === "passed" ? undefined : "worker",
        error: worker.error,
        run_dir: path.relative(runDir, phaseRunDir).split(path.sep).join("/"),
        worker_run_id: worker.run_id,
        worker_run_path: path
          .relative(runDir, path.join(phaseRunDir, "run.json"))
          .split(path.sep)
          .join("/"),
        trace_path: path
          .relative(runDir, path.join(phaseRunDir, worker.trace_path))
          .split(path.sep)
          .join("/"),
        stderr_path: path
          .relative(runDir, path.join(phaseRunDir, worker.stderr_path))
          .split(path.sep)
          .join("/"),
        declared_input_ids: plan.consumes,
        resolved_inputs: resolvedInputs,
        missing_input_ids: missingInputIds,
        artifacts: worker.artifacts,
        usage: worker.usage,
      };
      trial.phases.push(phaseRecord);
      if (worker.status !== "passed") {
        trial.status = worker.status;
        break;
      }

      for (const expected of plan.produces) {
        const artifact = worker.artifacts.find((candidate) => candidate.id === expected.id);
        if (expected.optional && artifact?.status === "missing") continue;
        const artifactPath = path.join(phaseRunDir, "workspace", expected.path);
        const actualSha256 = existsSync(artifactPath) ? sha256Path(artifactPath) : undefined;
        if (
          !artifact ||
          (artifact.status !== "passed" && artifact.status !== "present") ||
          !artifact.sha256 ||
          !actualSha256 ||
          artifact.sha256 !== actualSha256
        ) {
          phaseRecord.status = "failed";
          phaseRecord.failure_kind = "artifact_promotion";
          phaseRecord.error = `declared artifact was not promotable: ${expected.id}`;
          trial.status = "failed";
          break;
        }
        promoted.set(expected.id, {
          absolutePath: artifactPath,
          record: {
            id: expected.id,
            path: path.relative(runDir, artifactPath).split(path.sep).join("/"),
            sha256: actualSha256,
            producer_phase: phase.phase,
          },
        });
      }
      if (trial.status !== "passed") break;
    }
    record.trials.push(trial);
    record.status = combinedStatus(record.trials.map((candidate) => candidate.status));
    writePipelineRecord(runDir, record);
  }

  record.status = combinedStatus(record.trials.map((trial) => trial.status));
  const finished = now();
  record.finished_at = finished.toISOString();
  record.duration_ms = finished.getTime() - started.getTime();
  writePipelineRecord(runDir, record);
  return record;
}

export async function runTestPipelineCommand(argv = process.argv.slice(2)): Promise<void> {
  const args = parseTestPipelineArgs(argv);
  const repoRoot = path.resolve(args.root ?? process.cwd());
  const runDir = path.resolve(args.runDir ?? defaultTestPipelineRunDir(args.pipeline));
  const record = await runLinearPipeline({ ...args, repoRoot, runDir });
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  if (record.status !== "passed") process.exitCode = 1;
}
