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
  type ContainerNetworkPolicy,
  type ExpectedArtifact,
  type PiSkillRunRecord,
  type PiThinkingLevel,
  type RunPiSkillOptions,
  type RunStatus,
  type SandboxMode,
} from "@galaxy-foundry/gxwf-pi-harness";
import { detectDraft, nextDraftStep } from "@galaxy-tool-util/schema";
import { load as loadYaml } from "js-yaml";
import {
  assemblyPath,
  CAST_SLUG,
  loadAssembly,
  loadSkillProvenance,
  skillDir,
  type AssemblyManifest,
  type AssemblyPhase,
} from "../lib/cast-registry.js";
import { foundryHead } from "../lib/foundry-head.js";
import { readMarkdown } from "../lib/frontmatter.js";
import { sha256File } from "../lib/reconcile.js";
import {
  PIPELINE_RUN_FILE,
  type PipelineLoopIterationRecord,
  type PipelinePhaseRunRecord,
  type PipelineRunRecord,
  type PipelineScenario,
  type PipelineTrialRunRecord,
  type PipelineWorkerRunRecord,
  type PromotedArtifact,
} from "../lib/pipeline-run-record.js";
import { parseScenarioCases, resolveScenarioFixture } from "../lib/scenarios.js";
import { readOption } from "../lib/cli-args.js";
import { createWorkerRuntimeArgScanner, defaultWorkerRunDir } from "../lib/worker-runtime-args.js";

export type {
  PipelinePhaseRunRecord,
  PipelineRunRecord,
  PipelineTrialRunRecord,
} from "../lib/pipeline-run-record.js";

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
  /** Overrides each loop phase's default iteration cap. */
  maxIterations?: number;
  /** Run budget, checked before each worker starts; a running worker is bounded by its timeout. */
  maxCost?: number;
  maxTokens?: number;
}

interface PromotedArtifactState {
  record: PromotedArtifact;
  absolutePath: string;
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

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

export function parseTestPipelineArgs(argv: string[]): TestPipelineCliArgs {
  const runtime = createWorkerRuntimeArgScanner();
  const positional: string[] = [];
  let scenario: string | null = null;
  let through: string | undefined;
  let trials = 1;
  let maxIterations: number | undefined;
  let maxCost: number | undefined;
  let maxTokens: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]!;
    let option = readOption(argv, i, "--scenario");
    if (option) {
      scenario = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--through");
    if (option) {
      through = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--trials");
    if (option) {
      trials = parsePositiveInteger(option.value, "--trials");
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--max-iterations");
    if (option) {
      maxIterations = parsePositiveInteger(option.value, "--max-iterations");
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--max-tokens");
    if (option) {
      maxTokens = parsePositiveInteger(option.value, "--max-tokens");
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--max-cost");
    if (option) {
      maxCost = Number(option.value);
      if (!Number.isFinite(maxCost) || maxCost <= 0) {
        throw new Error("--max-cost must be a positive number");
      }
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--engine");
    if (option) {
      if (option.value !== "pi") throw new Error("--engine currently supports only pi");
      i = option.lastIndex;
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
    maxIterations,
    maxCost,
    maxTokens,
    piTestAuthDir: piTestAuth ? (piTestAuthDir ?? undefined) : undefined,
  };
}

export function defaultTestPipelineRunDir(pipeline: string, now?: Date, id?: string): string {
  return defaultWorkerRunDir("foundry-pi-pipeline-run", pipeline, now, id);
}

/** How the controller drives a loop phase: one fresh worker per call until the oracle says stop. */
interface LoopOracle {
  label: string;
  /** The artifact every call reads and rewrites, which the oracle reads before each call. */
  carried: string;
  /** Outputs only the terminal call writes. */
  terminal: string[];
  /** The work the next call should do, or null when the next call is the terminal one. */
  next(carriedPath: string): string[] | null;
  /** The cap when the run sets none, from the carried artifact at loop entry. */
  defaultCap(carriedPath: string): number;
  prompt(iteration: number, next: string[] | null): string;
}

function readYamlFile(file: string): unknown {
  return loadYaml(readFileSync(file, "utf8"));
}

const LOOP_ORACLES: Record<string, LoopOracle> = {
  // The Mold runs `gxwf draft-next-step` itself; the controller asks the same library function.
  "advance-galaxy-draft-step": {
    label: "draft loop",
    carried: "galaxy-workflow-draft",
    terminal: ["galaxy-workflow"],
    next(carriedPath) {
      const pick = nextDraftStep(readYamlFile(carriedPath));
      return pick.draft ? pick.step : null;
    },
    defaultCap(carriedPath) {
      const survey = detectDraft(readYamlFile(carriedPath));
      const steps = new Set(
        [...survey.todos, ...survey.planFields].map((hit) => JSON.stringify(hit.path)),
      );
      // A call per drafty step, as many again for steps a topology repair inserts, then the
      // terminal call.
      return 2 * steps.size + 1;
    },
    prompt(iteration, next) {
      return next
        ? `Loop iteration ${iteration}: \`gxwf draft-next-step\` picks step ${JSON.stringify(next)}. Advance that one step.`
        : `Loop iteration ${iteration}: \`gxwf draft-next-step\` reports \`draft: false\`. This is the terminal call: extract the concrete workflow.`;
    },
  },
};

function selectPhases(manifest: AssemblyManifest, through?: string): AssemblyPhase[] {
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
    if (phase.cast_present !== true) {
      throw new Error(`phase ${phase.phase} does not have a cast skill`);
    }
    if (!phase.skill || !CAST_SLUG.test(phase.skill)) {
      throw new Error(`phase ${phase.phase} has an invalid skill name`);
    }
    if (phase.loop && !Object.hasOwn(LOOP_ORACLES, phase.skill)) {
      throw new Error(
        `phase ${phase.phase} loops over ${phase.skill}, which has no controller loop oracle; select an earlier --through phase`,
      );
    }
  }
  return selected;
}

function resolveScenario(repoRoot: string, pipeline: string, name: string): PipelineScenario {
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

function consumedArtifactIds(repoRoot: string, skill: string): string[] {
  const consumes = loadSkillProvenance(repoRoot, skill)?.artifacts?.consumes ?? [];
  return consumes.map((artifact, index) => {
    if (typeof artifact?.id !== "string" || !CAST_SLUG.test(artifact.id)) {
      const provenancePath = path.join(skillDir(repoRoot, skill), "_provenance.json");
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

/** Why a worker that reported no error failed, when the artifacts it was judged on say. */
function failedArtifactsError(
  artifacts: PiSkillRunRecord["artifacts"],
  expected: ExpectedArtifact[],
): string | undefined {
  const optional = new Set(expected.filter((item) => item.optional).map((item) => item.id));
  const failed = artifacts.filter(
    (artifact) =>
      artifact.status === "failed" ||
      artifact.status === "error" ||
      (artifact.status === "missing" && !optional.has(artifact.id)),
  );
  if (!failed.length) return undefined;
  return `declared artifact did not pass: ${failed.map((artifact) => `${artifact.id} (${artifact.status})`).join(", ")}`;
}

function combinedStatus(statuses: RunStatus[]): RunStatus {
  if (statuses.every((status) => status === "passed")) return "passed";
  for (const status of ["error", "timed_out", "cancelled", "failed"] as const) {
    if (statuses.includes(status)) return status;
  }
  return "failed";
}

function spentBudget(
  usage: PipelineRunRecord["usage"],
  options: TestPipelineOptions,
): string | null {
  if (options.maxCost !== undefined && usage.cost >= options.maxCost) {
    return `cost ${Number(usage.cost.toFixed(6))} of --max-cost ${options.maxCost}`;
  }
  if (options.maxTokens !== undefined && usage.total_tokens >= options.maxTokens) {
    return `${usage.total_tokens} tokens of --max-tokens ${options.maxTokens}`;
  }
  return null;
}

function padded(n: number): string {
  return String(n).padStart(3, "0");
}

function writePipelineRecord(runDir: string, record: PipelineRunRecord): void {
  writeFileSync(path.join(runDir, PIPELINE_RUN_FILE), `${JSON.stringify(record, null, 2)}\n`);
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
  const assemblyFile = assemblyPath(repoRoot, options.pipeline);
  const phases = selectPhases(assembly, options.through);
  const scenario = resolveScenario(repoRoot, options.pipeline, options.scenario);
  const fixturePath = path.resolve(repoRoot, scenario.fixture_path);
  const phasePlans = phases.map((phase) => {
    const bundleDir = skillDir(repoRoot, phase.skill!);
    if (!existsSync(bundleDir)) throw new Error(`cast skill not found: ${bundleDir}`);
    return {
      phase,
      skillDir: bundleDir,
      consumes: consumedArtifactIds(repoRoot, phase.skill!),
      produces: expectedArtifactsFromSkill(bundleDir),
      loop: phase.loop ? LOOP_ORACLES[phase.skill!] : undefined,
    };
  });
  type PhasePlan = (typeof phasePlans)[number];
  for (const plan of phasePlans) {
    if (!plan.loop) continue;
    const label = `phase ${plan.phase.phase} (${plan.phase.skill})`;
    const produced = new Set(plan.produces.map((artifact) => artifact.id));
    for (const id of [plan.loop.carried, ...plan.loop.terminal]) {
      if (!produced.has(id)) {
        throw new Error(`${label} does not produce ${id}, which its loop oracle expects`);
      }
    }
    if (!plan.consumes.includes(plan.loop.carried)) {
      throw new Error(
        `${label} does not consume ${plan.loop.carried}, which its loop oracle expects`,
      );
    }
    if (options.sandbox === "container") {
      throw new Error(
        `${label} needs gxwf, which the container image does not ship; use --sandbox local`,
      );
    }
  }
  preflightInputBasenames(phasePlans, fixturePath);
  const started = now();
  const record: PipelineRunRecord = {
    pipeline_run_schema_version: 1,
    run_id: id(),
    // Rewritten after every trial; a reader must not mistake a dead run for a finished one.
    status: "running",
    started_at: started.toISOString(),
    finished_at: null,
    duration_ms: 0,
    pipeline: options.pipeline,
    source_revision: assembly.source_revision,
    harness_name: assembly.harness_name,
    assembly_path: path.relative(repoRoot, assemblyFile).split(path.sep).join("/"),
    assembly_sha256: sha256File(assemblyFile),
    foundry_head: foundryHead(repoRoot),
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
    trials_requested: options.trials,
    trials: [],
    usage: emptyUsage(),
  };
  mkdirSync(runDir, { recursive: true, mode: 0o700 });
  // On disk before any worker starts, so a run killed in its first trial still says what it was.
  writePipelineRecord(runDir, record);

  const relative = (target: string) => path.relative(runDir, target).split(path.sep).join("/");
  type Promoted = Map<string, PromotedArtifactState>;

  const staged = (plan: PhasePlan, promoted: Promoted, scenarioInput: string | null) => ({
    scenarioInput,
    resolved: plan.consumes.flatMap((id) => {
      const artifact = promoted.get(id);
      return artifact ? [artifact.record] : [];
    }),
    missing: plan.consumes.filter((id) => !promoted.has(id)),
    paths: [
      ...(scenarioInput ? [scenarioInput] : []),
      ...plan.consumes.flatMap((id) => {
        const artifact = promoted.get(id);
        return artifact ? [artifact.absolutePath] : [];
      }),
    ],
  });

  /** Runs one worker; a launch that throws is the worker's error. */
  const launch = async (
    plan: PhasePlan,
    workerRunDir: string,
    inputs: ReturnType<typeof staged>,
    expected: ExpectedArtifact[],
    extraPrompt?: string,
    cacheDir?: string,
  ): Promise<PipelineWorkerRunRecord> => {
    const base = {
      run_dir: relative(workerRunDir),
      resolved_inputs: inputs.resolved,
      missing_input_ids: inputs.missing,
    };
    let worker: PiSkillRunRecord;
    try {
      const prompt = phasePrompt(
        options.pipeline,
        options.scenario,
        plan.phase,
        inputs.scenarioInput !== null,
        inputs.resolved,
        inputs.missing,
      );
      worker = await runner({
        skillDir: plan.skillDir,
        prompt: extraPrompt ? `${prompt}\n${extraPrompt}` : prompt,
        inputPaths: inputs.paths,
        expectedArtifacts: expected,
        runDir: workerRunDir,
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
        cacheDir,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      return { ...base, status: "error", error: message, artifacts: [] };
    }
    addUsage(record.usage, worker.usage);
    return {
      ...base,
      status: worker.status,
      failure_kind: worker.failure_kind,
      error: worker.error ?? failedArtifactsError(worker.artifacts, expected),
      worker_run_id: worker.run_id,
      worker_run_path: relative(path.join(workerRunDir, "run.json")),
      trace_path: relative(path.join(workerRunDir, worker.trace_path)),
      stderr_path: relative(path.join(workerRunDir, worker.stderr_path)),
      artifacts: worker.artifacts,
      usage: worker.usage,
    };
  };

  /** Carries a passed worker's outputs forward, or marks why one could not be. */
  const promote = (
    result: PipelineWorkerRunRecord,
    expected: ExpectedArtifact[],
    workerRunDir: string,
    producerPhase: number,
    promoted: Promoted,
  ): void => {
    for (const declared of expected) {
      const artifact = result.artifacts.find((candidate) => candidate.id === declared.id);
      if (declared.optional && artifact?.status === "missing") continue;
      const artifactPath = path.join(workerRunDir, "workspace", declared.path);
      const actualSha256 = existsSync(artifactPath) ? sha256Path(artifactPath) : undefined;
      if (
        !artifact ||
        (artifact.status !== "passed" && artifact.status !== "present") ||
        !artifact.sha256 ||
        !actualSha256 ||
        artifact.sha256 !== actualSha256
      ) {
        result.status = "failed";
        result.failure_kind = "artifact_promotion";
        result.error = `declared artifact was not promotable: ${declared.id}`;
        return;
      }
      promoted.set(declared.id, {
        absolutePath: artifactPath,
        record: {
          id: declared.id,
          path: relative(artifactPath),
          sha256: actualSha256,
          producer_phase: producerPhase,
        },
      });
    }
  };

  const runLoop = async (
    plan: PhasePlan,
    oracle: LoopOracle,
    phaseRunDir: string,
    promoted: Promoted,
    cacheDir: string,
  ): Promise<PipelinePhaseRunRecord> => {
    const entry = staged(plan, promoted, null);
    const iterations: PipelineLoopIterationRecord[] = [];
    const latest = new Map<string, PipelineWorkerRunRecord["artifacts"][number]>();
    const phaseRecord: PipelinePhaseRunRecord = {
      phase: plan.phase.phase,
      skill: plan.phase.skill!,
      status: "passed",
      run_dir: relative(phaseRunDir),
      declared_input_ids: plan.consumes,
      resolved_inputs: entry.resolved,
      missing_input_ids: entry.missing,
      artifacts: [],
      usage: emptyUsage(),
      iterations,
    };
    const stop = (
      status: PipelinePhaseRunRecord["status"],
      failureKind: PipelinePhaseRunRecord["failure_kind"],
      error: string,
    ) => Object.assign(phaseRecord, { status, failure_kind: failureKind, error });

    const carriedAtEntry = promoted.get(oracle.carried);
    if (!carriedAtEntry) {
      return stop("error", undefined, `no earlier phase promoted ${oracle.carried}`);
    }
    // The carried artifact passed its validator to be promoted, but the oracle still parses it.
    const ask = <T>(question: () => T): T | Error => {
      try {
        return question();
      } catch (caught) {
        return caught instanceof Error ? caught : new Error(String(caught));
      }
    };
    const cap = options.maxIterations ?? ask(() => oracle.defaultCap(carriedAtEntry.absolutePath));
    if (cap instanceof Error) {
      return stop(
        "error",
        undefined,
        `loop oracle could not read ${oracle.carried}: ${cap.message}`,
      );
    }
    for (let n = 1; ; n++) {
      if (n > cap) {
        return stop(
          "failed",
          "loop_cap",
          `${oracle.label} reached ${cap} iteration${cap === 1 ? "" : "s"} without finishing`,
        );
      }
      const spent = spentBudget(record.usage, options);
      if (spent) {
        return stop("cancelled", "budget", `run budget spent before iteration ${n}: ${spent}`);
      }

      const before = promoted.get(oracle.carried)!;
      const next = ask(() => oracle.next(before.absolutePath));
      if (next instanceof Error) {
        return stop(
          "error",
          undefined,
          `loop oracle could not read ${oracle.carried}: ${next.message}`,
        );
      }
      const terminal = next === null;
      // Calls before the terminal one are not asked for the terminal outputs, so a partial one a
      // stalled call writes is never promoted. The terminal call need not rewrite the rest.
      const expected = plan.produces.flatMap((artifact) => {
        const terminalOutput = oracle.terminal.includes(artifact.id);
        if (!terminal) return terminalOutput ? [] : [artifact];
        return [{ ...artifact, optional: artifact.optional === true || !terminalOutput }];
      });
      const iterationDir = path.join(phaseRunDir, `iteration-${padded(n)}`);
      const result = await launch(
        plan,
        iterationDir,
        staged(plan, promoted, null),
        expected,
        oracle.prompt(n, next),
        cacheDir,
      );
      if (result.status === "passed") {
        promote(result, expected, iterationDir, plan.phase.phase, promoted);
      }
      iterations.push({ iteration: n, next_step: next, ...result });
      addUsage(phaseRecord.usage!, result.usage);
      for (const artifact of result.artifacts) {
        if (artifact.status !== "missing") latest.set(artifact.id, artifact);
      }
      phaseRecord.artifacts = [...latest.values()];

      if (result.status !== "passed") {
        return stop(
          result.status,
          result.failure_kind,
          `iteration ${n}: ${result.error ?? "no error recorded"}`,
        );
      }
      if (terminal) return phaseRecord;
      if (promoted.get(oracle.carried)!.record.sha256 === before.record.sha256) {
        return stop(
          "failed",
          "loop_no_progress",
          `iteration ${n} left ${oracle.carried} unchanged; step ${next.join(" > ")} is still drafty`,
        );
      }
    }
  };

  let budgetSpent = false;
  for (let trialNumber = 1; trialNumber <= options.trials && !budgetSpent; trialNumber++) {
    const trialDir = path.join(runDir, `trial-${padded(trialNumber)}`);
    mkdirSync(trialDir);
    const promoted: Promoted = new Map();
    const trial: PipelineTrialRunRecord = { trial: trialNumber, status: "passed", phases: [] };
    // Shared by the trial's loop iterations, so a wrapper one call fetched is there for the next.
    let cacheDir: string | undefined;

    for (const plan of phasePlans) {
      const phase = plan.phase;
      const phaseRunDir = path.join(trialDir, `phase-${padded(phase.phase)}-${phase.skill}`);
      const inputs = staged(plan, promoted, plan === phasePlans[0] ? fixturePath : null);
      let phaseRecord: PipelinePhaseRunRecord;
      const spent = spentBudget(record.usage, options);
      if (spent) {
        phaseRecord = {
          phase: phase.phase,
          skill: phase.skill!,
          status: "cancelled",
          failure_kind: "budget",
          error: `run budget spent before phase ${phase.phase}: ${spent}`,
          run_dir: relative(phaseRunDir),
          declared_input_ids: plan.consumes,
          resolved_inputs: inputs.resolved,
          missing_input_ids: inputs.missing,
          artifacts: [],
        };
      } else if (plan.loop) {
        if (!cacheDir) {
          cacheDir = path.join(trialDir, "tool-cache");
          mkdirSync(cacheDir);
        }
        phaseRecord = await runLoop(plan, plan.loop, phaseRunDir, promoted, cacheDir);
      } else {
        const result = await launch(plan, phaseRunDir, inputs, plan.produces);
        phaseRecord = {
          phase: phase.phase,
          skill: phase.skill!,
          declared_input_ids: plan.consumes,
          ...result,
        };
        if (result.status === "passed") {
          promote(phaseRecord, plan.produces, phaseRunDir, phase.phase, promoted);
        }
      }
      trial.phases.push(phaseRecord);
      if (phaseRecord.status !== "passed") {
        trial.status = phaseRecord.status;
        budgetSpent = phaseRecord.failure_kind === "budget";
        break;
      }
    }
    record.trials.push(trial);
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
