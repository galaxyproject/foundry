import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { isDeepStrictEqual } from "node:util";

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
  type SandboxMode,
} from "@galaxy-foundry/gxwf-pi-harness";
import { detectDraft, nextDraftStep } from "@galaxy-tool-util/schema";
import { load as loadYaml } from "js-yaml";
import {
  assemblyPath,
  CAST_SLUG,
  declaredOutputs,
  loadAssembly,
  loadSkillProvenance,
  phaseSkills,
  skillDir,
  type AssemblyManifest,
  type AssemblyPhase,
  type DeclaredOutput,
} from "../lib/cast-registry.js";
import { foundryHead } from "../lib/foundry-head.js";
import { readMarkdown } from "../lib/frontmatter.js";
import { parseOpenRequirements } from "../lib/run-ledgers.js";
import { sha256File } from "../lib/reconcile.js";
import {
  PIPELINE_RUN_FILE,
  phaseWorkers,
  type PipelineBranchLegRecord,
  type PipelineLoopIterationRecord,
  type PipelineOutcome,
  type PipelinePhaseRunRecord,
  type PipelineRunRecord,
  type PipelineScenario,
  type PipelineSeedRecord,
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
  /** The first phase to run; the artifacts of those before it come from `seedRun`. */
  from?: string;
  /** An earlier `test-pipeline` run directory of the same pipeline and scenario. */
  seedRun?: string;
  /** The seed run's trial to carry artifacts from; defaults to 1. */
  seedTrial?: number;
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
  /** Overrides each loop phase's cap on repair escalations. */
  maxRepairs?: number;
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
  let from: string | undefined;
  let seedRun: string | undefined;
  let seedTrial: number | undefined;
  let trials = 1;
  let maxIterations: number | undefined;
  let maxRepairs: number | undefined;
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
    option = readOption(argv, i, "--from");
    if (option) {
      from = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--seed-run");
    if (option) {
      seedRun = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--seed-trial");
    if (option) {
      seedTrial = parsePositiveInteger(option.value, "--seed-trial");
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
    option = readOption(argv, i, "--max-repairs");
    if (option) {
      maxRepairs = parsePositiveInteger(option.value, "--max-repairs");
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
    from,
    seedRun,
    seedTrial,
    trials,
    maxIterations,
    maxRepairs,
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
  /**
   * Where a call that could not do its work records why: the ids of what blocks `next` that the
   * call itself wrote or changed, from the artifact as the call left it and as it found it.
   */
  blockers?: {
    artifact: string;
    read(file: string, earlier: string | null, next: string[]): string[];
  };
  /** The worker a blocked call is escalated to, and how the controller judges what it did. */
  repair?: {
    skill: string;
    /** Open blocking entries in the blockers artifact; each repair must lower the count. */
    open(file: string): number;
    /** The escalation cap the blockers artifact itself sets, if it sets one. */
    cap(file: string): number | null;
    prompt(iteration: number, next: string[], blockers: string[]): string;
  };
}

/** Repairs a loop escalates to when neither the run nor the ledger caps them. */
const DEFAULT_REPAIR_CAP = 3;

function ledgerEntries(ledger: string) {
  const parsed = parseOpenRequirements(readYamlFile(ledger), ledger);
  if (!parsed) throw new Error("it has no list of entries");
  return parsed.entries;
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
    blockers: {
      artifact: "open-requirements-ledger",
      read(file, earlier, next) {
        const before = new Map(
          earlier ? ledgerEntries(earlier).map((entry) => [entry.id, entry]) : [],
        );
        // A blocking entry stays open until a repair closes it, and is surrendered at the cap.
        return ledgerEntries(file)
          .filter(
            (entry) =>
              entry.blocking === true &&
              (entry.status === "open" || entry.status === "surrendered") &&
              entry.step === next.at(-1) &&
              !isDeepStrictEqual(before.get(entry.id), entry),
          )
          .map((entry) => entry.id);
      },
    },
    // The Mold's step 5 escalation, which a single-skill worker cannot make itself. The ledger's
    // `topology_repair` header is left as the calls wrote it; the run record counts escalations.
    repair: {
      skill: "repair-galaxy-draft-topology",
      open(file) {
        return ledgerEntries(file).filter(
          (entry) => entry.blocking === true && entry.status === "open",
        ).length;
      },
      cap(file) {
        const header = (readYamlFile(file) as { topology_repair?: { cap?: unknown } } | null)
          ?.topology_repair;
        return Number.isSafeInteger(header?.cap) && (header!.cap as number) > 0
          ? (header!.cap as number)
          : null;
      },
      prompt(iteration, next, blockers) {
        return `Loop iteration ${iteration}: the draft loop escalates to you. The call before could not advance step ${JSON.stringify(next)}; open-requirements-ledger entries ${blockers.join(", ")} block it. Repair that region of the draft, or narrow the step, and mark each entry you close resolved.`;
      },
    },
  },
};

/** How the controller walks a branch: one worker per leg until nothing is left to resolve. */
interface BranchOracle {
  /** The artifact every leg writes, and every leg after the first reads and fills in. */
  carried: string;
  /** What `carried` leaves unresolved. */
  unresolved(carriedPath: string): string[];
  /** How a leg's `carried` breaks the contract the earlier one set, if it does. */
  broken(carriedPath: string, earlierPath: string | null): string | null;
  prompt(leg: number, unresolved: string[] | null): string;
}

interface TestDataRef {
  workflow_label: string;
  resolved: boolean;
}

function readTestDataRefs(file: string): TestDataRef[] {
  // A promoted ref file passed `foundry validate-test-data-refs`.
  return (JSON.parse(readFileSync(file, "utf8")) as { refs: TestDataRef[] }).refs;
}

const BRANCH_ORACLES: Record<string, BranchOracle> = {
  "test-data-resolution": {
    carried: "test-data-refs",
    unresolved(carriedPath) {
      return readTestDataRefs(carriedPath)
        .filter((ref) => !ref.resolved)
        .map((ref) => ref.workflow_label);
    },
    broken(carriedPath, earlierPath) {
      const refs = readTestDataRefs(carriedPath);
      if (!refs.length) return "wrote no refs";
      if (!earlierPath) return null;
      const byLabel = new Map(refs.map((ref) => [ref.workflow_label, ref]));
      // A later leg keeps every ref an earlier one wrote, and every resolved one unchanged.
      for (const earlier of readTestDataRefs(earlierPath)) {
        const ref = byLabel.get(earlier.workflow_label);
        if (!ref) return `dropped ref ${earlier.workflow_label}, which an earlier leg wrote`;
        if (earlier.resolved && !isDeepStrictEqual(ref, earlier)) {
          return `changed ref ${earlier.workflow_label}, which an earlier leg resolved`;
        }
      }
      return null;
    },
    prompt(leg, unresolved) {
      return unresolved
        ? `Branch leg ${leg}: the staged test-data-refs leaves these inputs unresolved: ${unresolved.join(", ")}. Keep every other ref unchanged and resolve only those.`
        : `Branch leg ${leg}: write a ref for every workflow input.`;
    },
  },
};

function phaseIndex(manifest: AssemblyManifest, value: string, flag: string): number {
  if (/^[1-9][0-9]*$/.test(value)) {
    const index = manifest.phases.findIndex((phase) => phase.phase === Number(value));
    if (index < 0) throw new Error(`${flag} phase not found: ${value}`);
    return index;
  }
  const matches = manifest.phases
    .map((phase, index) => ({ phase, index }))
    .filter(({ phase }) => (phase.skill ?? phase.pattern) === value);
  if (matches.length !== 1) throw new Error(`${flag} skill must match one phase: ${value}`);
  return matches[0]!.index;
}

/** The phases from `from` through `through`; only those are checked as runnable. */
export function selectPhases(
  manifest: AssemblyManifest,
  through?: string,
  from?: string,
): AssemblyPhase[] {
  if (!manifest.phases.length) throw new Error("pipeline assembly has no phases");
  const throughIndex =
    through === undefined ? manifest.phases.length - 1 : phaseIndex(manifest, through, "--through");
  const fromIndex = from === undefined ? 0 : phaseIndex(manifest, from, "--from");
  if (fromIndex > throughIndex) {
    throw new Error(
      `--from phase ${manifest.phases[fromIndex]!.phase} comes after --through phase ${manifest.phases[throughIndex]!.phase}`,
    );
  }

  const selected = manifest.phases.slice(fromIndex, throughIndex + 1);
  const phaseNumbers = new Set<number>();
  for (const phase of selected) {
    if (!Number.isSafeInteger(phase.phase) || phase.phase < 1) {
      throw new Error("pipeline assembly contains an invalid phase number");
    }
    if (phaseNumbers.has(phase.phase)) {
      throw new Error(`pipeline assembly repeats phase number ${phase.phase}`);
    }
    phaseNumbers.add(phase.phase);
    if (phase.kind === "branch" && Object.hasOwn(BRANCH_ORACLES, phase.pattern)) {
      const legs = phaseSkills(phase);
      // A sentinel such as user-supplied is a hand-off to a person, so only the chain's end.
      const sentinels = phase.chain.slice(legs.length);
      if (!legs.length || phase.chain.slice(0, legs.length).some((step, i) => step !== legs[i])) {
        throw new Error(`phase ${phase.phase} chain has a sentinel before its last skill`);
      }
      if (sentinels.length > 1) {
        throw new Error(`phase ${phase.phase} chain ends on more than one sentinel`);
      }
      legs.forEach((leg, i) => {
        if (phase.cast_present[i] !== true) {
          throw new Error(`phase ${phase.phase} leg ${leg} does not have a cast skill`);
        }
        if (!CAST_SLUG.test(leg)) throw new Error(`phase ${phase.phase} has an invalid skill name`);
      });
      continue;
    }
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

/** An artifact an earlier run carried forward, checked against that run's record. */
interface SeedSource {
  id: string;
  sha256: string;
  producerPhase: number;
  producerSkill: string;
  /** Its path in the producing worker's workspace, which its copy keeps. */
  workspacePath: string;
  absolutePath: string;
}

interface SeedPlan {
  record: Omit<PipelineSeedRecord, "artifacts">;
  sources: SeedSource[];
}

/**
 * What an earlier run of the same scenario carried forward from the phases before `fromPhase`:
 * the latest write of each artifact by a phase that passed, as the run itself promoted them. A
 * seed run that was itself seeded passes its own seed on.
 */
function planSeed(
  seedRun: string,
  trialNumber: number,
  pipeline: string,
  scenario: PipelineScenario,
  fromPhase: number,
  /** This pipeline's phases before `fromPhase`, which the seed run's must have run. */
  earlierPhases: AssemblyPhase[],
): SeedPlan {
  const dir = path.resolve(seedRun);
  const file = path.join(dir, PIPELINE_RUN_FILE);
  if (!existsSync(file)) throw new Error(`seed run has no ${PIPELINE_RUN_FILE}: ${dir}`);
  const earlier = JSON.parse(readFileSync(file, "utf8")) as PipelineRunRecord;
  if (earlier.pipeline !== pipeline) {
    throw new Error(`seed run is of pipeline '${earlier.pipeline}', not '${pipeline}'`);
  }
  if (earlier.scenario?.name !== scenario.name) {
    throw new Error(`seed run is of scenario '${earlier.scenario?.name}', not '${scenario.name}'`);
  }
  if (earlier.scenario.fixture_sha256 !== scenario.fixture_sha256) {
    throw new Error("seed run's scenario fixture has changed since it ran");
  }
  const trial = earlier.trials?.find((candidate) => candidate.trial === trialNumber);
  if (!trial) throw new Error(`seed run has no trial ${trialNumber}`);

  const inherited = earlier.seed;
  const phases = [...(inherited?.phases ?? []), ...trial.phases].filter(
    (phase) => phase.phase < fromPhase,
  );
  for (const phase of phases) {
    const current = earlierPhases.find((candidate) => candidate.phase === phase.phase);
    const currentSkill = current?.skill ?? current?.pattern;
    if (currentSkill !== phase.skill) {
      throw new Error(
        `seed run's phase ${phase.phase} ran ${phase.skill}, but this pipeline's phase ${phase.phase} is ${currentSkill ?? "absent"}`,
      );
    }
  }
  const latest = new Map<string, SeedSource>();
  for (const artifact of inherited?.artifacts ?? []) {
    if (artifact.producer_phase >= fromPhase) continue;
    latest.set(artifact.id, {
      id: artifact.id,
      sha256: artifact.sha256,
      producerPhase: artifact.producer_phase,
      producerSkill: phases.find((phase) => phase.phase === artifact.producer_phase)!.skill,
      // Under `seed/phase-NNN-<skill>/`, the copy keeps the producing workspace's own path.
      workspacePath: artifact.path.split("/").slice(2).join("/"),
      absolutePath: path.join(dir, artifact.path),
    });
  }
  for (const phase of trial.phases.filter((candidate) => candidate.phase < fromPhase)) {
    // A phase that did not pass may have written outputs the run refused to carry forward.
    if (phase.status !== "passed") continue;
    for (const worker of phaseWorkers(phase)) {
      for (const artifact of worker.artifacts) {
        if (artifact.status !== "passed" && artifact.status !== "present") continue;
        latest.set(artifact.id, {
          id: artifact.id,
          sha256: artifact.sha256 ?? "",
          producerPhase: phase.phase,
          producerSkill: phase.skill,
          workspacePath: artifact.path,
          absolutePath: path.join(dir, worker.run_dir, "workspace", artifact.path),
        });
      }
    }
  }
  for (const source of latest.values()) {
    if (!existsSync(source.absolutePath) || sha256Path(source.absolutePath) !== source.sha256) {
      throw new Error(
        `seed run's ${source.id} from phase ${source.producerPhase} no longer matches its recorded sha256: ${source.absolutePath}`,
      );
    }
  }
  return {
    record: {
      run_dir: dir,
      run_id: earlier.run_id,
      trial: trialNumber,
      assembly_sha256: earlier.assembly_sha256,
      from_phase: fromPhase,
      phases: phases.map((phase) => ({
        phase: phase.phase,
        skill: phase.skill,
        status: phase.status,
      })),
    },
    sources: [...latest.values()],
  };
}

/**
 * Refuses a run whose phases read an artifact the seed run did not carry in good order: one last
 * produced, before `--from`, by a phase that did not pass there, since any older copy would be
 * stale; or one that phase must write but the seed has no copy of. An optional artifact a passed
 * phase did not write stays absent, as it would in a run from phase 1.
 */
function preflightSeededInputs(
  outputs: DeclaredOutput[],
  earlierPhases: AssemblyPhase[],
  workerPlans: WorkerPlan[],
  seed: SeedPlan | null,
): void {
  const declared = new Map(outputs.map((output) => [output.id, output]));
  const carried = new Set(seed?.sources.map((source) => source.id));
  const producedHere = new Set<string>();
  for (const plan of workerPlans) {
    for (const id of plan.consumes) {
      const output = declared.get(id);
      const producer = [...earlierPhases]
        .reverse()
        .find((phase) => output?.producing_phases.includes(phase.phase));
      if (producedHere.has(id) || !output || !producer) continue;
      const consumer = `phase ${plan.phase.phase} (${plan.skill}) consumes ${id}, which phase ${producer.phase} (${producer.skill ?? producer.pattern}) produces`;
      const ended = seed?.record.phases.find((phase) => phase.phase === producer.phase);
      if (ended?.status !== "passed") {
        throw new Error(
          `${consumer}, but the seed run's phase ${producer.phase} ${ended ? "did not pass" : "never ran"}`,
        );
      }
      if (!carried.has(id) && !output.optional) {
        throw new Error(
          `${consumer}; it passed in the seed run, but the seed run carried no copy of it`,
        );
      }
    }
    for (const artifact of plan.produces) producedHere.add(artifact.id);
  }
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
  phase: number,
  skill: string,
  hasScenarioInput: boolean,
  resolvedInputs: PromotedArtifact[],
  missingInputIds: string[],
): string {
  const lines = [
    `Execute phase ${phase} (${skill}) of Pipeline '${pipeline}' for scenario '${scenario}'.`,
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

/** One worker's skill: a phase's own, or one leg of a branch. */
interface WorkerPlan {
  phase: AssemblyPhase;
  skill: string;
  skillDir: string;
  consumes: string[];
  produces: ExpectedArtifact[];
}

interface MoldPhasePlan extends WorkerPlan {
  /** The worker a blocked loop call is escalated to, when the harness casts it. */
  repair?: WorkerPlan;
  loop?: LoopOracle;
}

interface BranchPhasePlan {
  phase: AssemblyPhase;
  /** The branch's pattern name. */
  skill: string;
  branch: BranchOracle;
  legs: WorkerPlan[];
  /** The chain's closing hand-off to a person, such as user-supplied. */
  sentinel: string | null;
}

type PhasePlan = MoldPhasePlan | BranchPhasePlan;

function preflightInputBasenames(
  workerPlans: WorkerPlan[],
  fixtureInput: string | null,
  seeded: SeedSource[],
): void {
  const available = new Map(seeded.map((source) => [source.id, source.workspacePath]));
  workerPlans.forEach((plan, index) => {
    const basenames = [
      ...(index === 0 && fixtureInput ? [path.basename(realpathSync(fixtureInput))] : []),
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

function combinedStatus(statuses: PipelineOutcome[]): PipelineOutcome {
  if (statuses.every((status) => status === "passed")) return "passed";
  for (const status of ["error", "timed_out", "cancelled", "failed", "blocked"] as const) {
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

/** An oracle's answer, or the error it threw reading an artifact a validator already passed. */
function attempt<T>(question: () => T): T | Error {
  try {
    return question();
  } catch (caught) {
    return caught instanceof Error ? caught : new Error(String(caught));
  }
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
  if (options.seedRun !== undefined && options.from === undefined) {
    throw new Error("--seed-run needs --from");
  }
  if (options.seedTrial !== undefined && options.seedRun === undefined) {
    throw new Error("--seed-trial needs --seed-run");
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
  const phases = selectPhases(assembly, options.through, options.from);
  // The scenario fixture is the first phase's input, so a run started later is not given it.
  const firstPhase = assembly.phases[0]!.phase;
  const fromPhase = phases[0]!.phase;
  if (fromPhase !== firstPhase && options.seedRun === undefined) {
    throw new Error(
      `--from phase ${fromPhase} needs --seed-run for the artifacts of phases before it`,
    );
  }
  if (fromPhase === firstPhase && options.seedRun !== undefined) {
    throw new Error(`--seed-run needs --from to name a phase after phase ${firstPhase}`);
  }
  const scenario = resolveScenario(repoRoot, options.pipeline, options.scenario);
  const fixturePath = path.resolve(repoRoot, scenario.fixture_path);
  const earlierPhases = assembly.phases.slice(0, assembly.phases.indexOf(phases[0]!));
  const seed = options.seedRun
    ? planSeed(
        options.seedRun,
        options.seedTrial ?? 1,
        options.pipeline,
        scenario,
        fromPhase,
        earlierPhases,
      )
    : null;
  const workerPlan = (phase: AssemblyPhase, skill: string): WorkerPlan => {
    const bundleDir = skillDir(repoRoot, skill);
    if (!existsSync(bundleDir)) throw new Error(`cast skill not found: ${bundleDir}`);
    return {
      phase,
      skill,
      skillDir: bundleDir,
      consumes: consumedArtifactIds(repoRoot, skill),
      produces: expectedArtifactsFromSkill(bundleDir),
    };
  };
  // A harness without the repair cast ends a blocked loop call as loop_blocked, as before.
  const repairPlan = (phase: AssemblyPhase): WorkerPlan | undefined => {
    const skill = phase.loop && phase.skill ? LOOP_ORACLES[phase.skill]?.repair?.skill : undefined;
    return skill && existsSync(skillDir(repoRoot, skill)) ? workerPlan(phase, skill) : undefined;
  };
  const phasePlans: PhasePlan[] = phases.map((phase) =>
    phase.kind === "branch"
      ? {
          phase,
          skill: phase.pattern,
          branch: BRANCH_ORACLES[phase.pattern]!,
          legs: phaseSkills(phase).map((leg) => workerPlan(phase, leg)),
          sentinel: phase.chain[phaseSkills(phase).length] ?? null,
        }
      : {
          ...workerPlan(phase, phase.skill),
          loop: phase.loop ? LOOP_ORACLES[phase.skill] : undefined,
          repair: repairPlan(phase),
        },
  );
  const workerPlans = phasePlans.flatMap((plan) =>
    "legs" in plan ? plan.legs : plan.repair ? [plan, plan.repair] : [plan],
  );
  for (const plan of phasePlans) {
    if (!("legs" in plan)) continue;
    const label = `phase ${plan.phase.phase} (${plan.skill})`;
    const { carried } = plan.branch;
    plan.legs.forEach((leg, i) => {
      if (!leg.produces.some((artifact) => artifact.id === carried)) {
        throw new Error(
          `${label} leg ${leg.skill} does not produce ${carried}, which the branch carries`,
        );
      }
      if (i > 0 && !leg.consumes.includes(carried)) {
        throw new Error(
          `${label} leg ${leg.skill} does not consume ${carried}, which the branch carries`,
        );
      }
    });
  }
  for (const plan of phasePlans) {
    if ("legs" in plan || !plan.loop) continue;
    const label = `phase ${plan.phase.phase} (${plan.phase.skill})`;
    const produced = new Set(plan.produces.map((artifact) => artifact.id));
    const expects = [plan.loop.carried, ...plan.loop.terminal];
    if (plan.loop.blockers) expects.push(plan.loop.blockers.artifact);
    for (const id of expects) {
      if (!produced.has(id)) {
        throw new Error(`${label} does not produce ${id}, which its loop oracle expects`);
      }
    }
    if (!plan.consumes.includes(plan.loop.carried)) {
      throw new Error(
        `${label} does not consume ${plan.loop.carried}, which its loop oracle expects`,
      );
    }
    if (plan.repair) {
      const carries = [plan.loop.carried, plan.loop.blockers!.artifact];
      const repairs = `${label} escalates to ${plan.repair.skill}, which does not`;
      for (const id of carries) {
        if (!plan.repair.produces.some((artifact) => artifact.id === id)) {
          throw new Error(`${repairs} produce ${id}`);
        }
        if (!plan.repair.consumes.includes(id)) throw new Error(`${repairs} consume ${id}`);
      }
    }
    if (options.sandbox === "container") {
      throw new Error(
        `${label} needs gxwf, which the container image does not ship; use --sandbox local`,
      );
    }
  }
  preflightSeededInputs(declaredOutputs(repoRoot, assembly), earlierPhases, workerPlans, seed);
  preflightInputBasenames(
    workerPlans,
    fromPhase === firstPhase ? fixturePath : null,
    seed?.sources ?? [],
  );
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
  const relative = (target: string) => path.relative(runDir, target).split(path.sep).join("/");
  type Promoted = Map<string, PromotedArtifactState>;

  // Copied, so the run stands on its own once the seed run is gone.
  const seeded: PromotedArtifactState[] = (seed?.sources ?? []).map((source) => {
    const target = path.join(
      runDir,
      "seed",
      `phase-${padded(source.producerPhase)}-${source.producerSkill}`,
      source.workspacePath,
    );
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(source.absolutePath, target, { recursive: true, dereference: true });
    return {
      absolutePath: target,
      record: {
        id: source.id,
        path: relative(target),
        sha256: source.sha256,
        producer_phase: source.producerPhase,
      },
    };
  });
  if (seed) record.seed = { ...seed.record, artifacts: seeded.map((artifact) => artifact.record) };
  // On disk before any worker starts, so a run killed in its first trial still says what it was.
  writePipelineRecord(runDir, record);

  const staged = (plan: WorkerPlan, promoted: Promoted, scenarioInput: string | null) => ({
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
    plan: WorkerPlan,
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
        plan.phase.phase,
        plan.skill,
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
    result: PipelineWorkerRunRecord | PipelinePhaseRunRecord,
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

  /**
   * A phase run as several workers in turn — a loop's calls or a branch's legs — kept as one
   * record. Its `run_dir` holds one directory per worker, its `artifacts` are the latest each id
   * was written, and its `usage` sums the workers'.
   */
  const multiWorkerPhase = (
    plan: PhasePlan,
    entryPlan: WorkerPlan,
    phaseRunDir: string,
    promoted: Promoted,
  ) => {
    const entry = staged(entryPlan, promoted, null);
    const latest = new Map<string, PipelineWorkerRunRecord["artifacts"][number]>();
    const phaseRecord: PipelinePhaseRunRecord = {
      phase: plan.phase.phase,
      skill: plan.skill,
      status: "passed",
      run_dir: relative(phaseRunDir),
      declared_input_ids: entryPlan.consumes,
      resolved_inputs: entry.resolved,
      missing_input_ids: entry.missing,
      artifacts: [],
      usage: emptyUsage(),
    };
    const stop = (
      status: PipelinePhaseRunRecord["status"],
      failureKind: PipelinePhaseRunRecord["failure_kind"],
      error: string,
    ) => Object.assign(phaseRecord, { status, failure_kind: failureKind, error });
    /** Runs one worker, carries forward what it passed, and adds it to the phase. */
    const step = async (
      worker: WorkerPlan,
      workerDir: string,
      expected: ExpectedArtifact[],
      prompt: string,
      cacheDir?: string,
    ): Promise<PipelineWorkerRunRecord> => {
      const result = await launch(
        worker,
        workerDir,
        staged(worker, promoted, null),
        expected,
        prompt,
        cacheDir,
      );
      if (result.status === "passed") {
        promote(result, expected, workerDir, plan.phase.phase, promoted);
      }
      addUsage(phaseRecord.usage!, result.usage);
      for (const artifact of result.artifacts) {
        if (artifact.status !== "missing") latest.set(artifact.id, artifact);
      }
      phaseRecord.artifacts = [...latest.values()];
      return result;
    };
    return { phaseRecord, stop, step };
  };

  const runLoop = async (
    plan: MoldPhasePlan,
    oracle: LoopOracle,
    phaseRunDir: string,
    promoted: Promoted,
    cacheDir: string,
  ): Promise<PipelinePhaseRunRecord> => {
    const { phaseRecord, stop, step } = multiWorkerPhase(plan, plan, phaseRunDir, promoted);
    const iterations: PipelineLoopIterationRecord[] = [];
    phaseRecord.iterations = iterations;

    const carriedAtEntry = promoted.get(oracle.carried);
    if (!carriedAtEntry) {
      return stop("error", undefined, `no earlier phase promoted ${oracle.carried}`);
    }
    const cap =
      options.maxIterations ?? attempt(() => oracle.defaultCap(carriedAtEntry.absolutePath));
    if (cap instanceof Error) {
      return stop(
        "error",
        undefined,
        `loop oracle could not read ${oracle.carried}: ${cap.message}`,
      );
    }
    const repairOracle = plan.repair && oracle.repair;
    // The cap is read once, from the ledger the loop is handed, so no call can raise its own.
    const ledgerAtEntry = oracle.blockers && promoted.get(oracle.blockers.artifact);
    const ledgerCap =
      repairOracle && ledgerAtEntry
        ? attempt(() => repairOracle.cap(ledgerAtEntry.absolutePath))
        : null;
    const repairCap =
      options.maxRepairs ??
      (ledgerCap instanceof Error || ledgerCap === null ? DEFAULT_REPAIR_CAP : ledgerCap);
    let repairs = 0;
    // `n` counts the oracle's calls, which `cap` bounds; repairs have their own cap.
    for (let n = 1; ; n++) {
      if (n > cap) {
        return stop(
          "failed",
          "loop_cap",
          `${oracle.label} reached ${cap} iteration${cap === 1 ? "" : "s"} without finishing`,
        );
      }
      const at = iterations.length + 1;
      const spent = spentBudget(record.usage, options);
      if (spent) {
        return stop("cancelled", "budget", `run budget spent before iteration ${at}: ${spent}`);
      }

      const before = promoted.get(oracle.carried)!;
      const ledgerBefore = oracle.blockers && promoted.get(oracle.blockers.artifact);
      const next = attempt(() => oracle.next(before.absolutePath));
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
      const iterationDir = path.join(phaseRunDir, `iteration-${padded(at)}`);
      const result = await step(plan, iterationDir, expected, oracle.prompt(at, next), cacheDir);
      iterations.push({ iteration: at, next_step: next, ...result });

      if (result.status !== "passed") {
        return stop(
          result.status,
          result.failure_kind,
          `iteration ${at}: ${result.error ?? "no error recorded"}`,
        );
      }
      if (terminal) return phaseRecord;
      if (promoted.get(oracle.carried)!.record.sha256 === before.record.sha256) {
        const stalled = `iteration ${at} left ${oracle.carried} unchanged; step ${next.join(" > ")}`;
        const ledger = oracle.blockers && promoted.get(oracle.blockers.artifact);
        const blockers = ledger
          ? attempt(() =>
              oracle.blockers!.read(ledger.absolutePath, ledgerBefore?.absolutePath ?? null, next),
            )
          : [];
        if (blockers instanceof Error) {
          return stop(
            "failed",
            "loop_no_progress",
            `${stalled} is still drafty, and ${oracle.blockers!.artifact} could not be read: ${blockers.message}`,
          );
        }
        if (!blockers.length)
          return stop("failed", "loop_no_progress", `${stalled} is still drafty`);
        const blocked = `${stalled} is blocked by ${oracle.blockers!.artifact} entries ${blockers.join(", ")}`;
        if (!repairOracle) return stop("failed", "loop_blocked", blocked);

        if (repairs >= repairCap) {
          return stop(
            "failed",
            "loop_blocked",
            `${blocked}, and the loop has reached its cap of ${repairCap} repair${repairCap === 1 ? "" : "s"}`,
          );
        }
        const repairAt = iterations.length + 1;
        const repairSpent = spentBudget(record.usage, options);
        if (repairSpent) {
          return stop(
            "cancelled",
            "budget",
            `run budget spent before the repair at iteration ${repairAt}: ${repairSpent}`,
          );
        }
        const openBefore = attempt(() => repairOracle.open(ledger!.absolutePath));
        repairs++;
        const repaired = await step(
          plan.repair!,
          path.join(phaseRunDir, `iteration-${padded(repairAt)}`),
          plan.repair!.produces,
          repairOracle.prompt(repairAt, next, blockers),
          cacheDir,
        );
        const repairRecord: PipelineLoopIterationRecord = {
          iteration: repairAt,
          next_step: next,
          skill: plan.repair!.skill,
          ...repaired,
        };
        iterations.push(repairRecord);
        if (repaired.status !== "passed") {
          return stop(
            repaired.status,
            repaired.failure_kind,
            `iteration ${repairAt} (${plan.repair!.skill}): ${repaired.error ?? "no error recorded"}`,
          );
        }
        const openAfter = attempt(() =>
          repairOracle.open(promoted.get(oracle.blockers!.artifact)!.absolutePath),
        );
        if (openBefore instanceof Error || openAfter instanceof Error) {
          const failure = openBefore instanceof Error ? openBefore : (openAfter as Error);
          return stop(
            "error",
            undefined,
            `loop oracle could not read ${oracle.blockers!.artifact} around the repair at iteration ${repairAt}: ${failure.message}`,
          );
        }
        repairRecord.open_blocking = { before: openBefore, after: openAfter };
        if (openAfter >= openBefore) {
          return stop(
            "failed",
            "loop_blocked",
            `${blocked}, and the repair at iteration ${repairAt} left ${openAfter} open blocking entr${openAfter === 1 ? "y" : "ies"}, no fewer than before`,
          );
        }
      }
    }
  };

  const runBranch = async (
    plan: BranchPhasePlan,
    phaseRunDir: string,
    promoted: Promoted,
  ): Promise<PipelinePhaseRunRecord> => {
    const oracle = plan.branch;
    const { phaseRecord, stop, step } = multiWorkerPhase(
      plan,
      plan.legs[0]!,
      phaseRunDir,
      promoted,
    );
    const legs: PipelineBranchLegRecord[] = [];
    phaseRecord.legs = legs;

    let unresolved: string[] | null = null;
    for (const [index, leg] of plan.legs.entries()) {
      const n = index + 1;
      const spent = spentBudget(record.usage, options);
      if (spent) return stop("cancelled", "budget", `run budget spent before leg ${n}: ${spent}`);

      const earlier = promoted.get(oracle.carried);
      const legDir = path.join(phaseRunDir, `leg-${n}-${leg.skill}`);
      const result = await step(leg, legDir, leg.produces, oracle.prompt(n, unresolved));
      const legRecord: PipelineBranchLegRecord = {
        leg: n,
        skill: leg.skill,
        unresolved: null,
        ...result,
      };
      legs.push(legRecord);

      const label = `leg ${n} (${leg.skill})`;
      if (result.status !== "passed") {
        return stop(
          result.status,
          result.failure_kind,
          `${label}: ${result.error ?? "no error recorded"}`,
        );
      }
      const carried = promoted.get(oracle.carried)!.absolutePath;
      const answer = attempt(() => ({
        broken: oracle.broken(carried, earlier?.absolutePath ?? null),
        unresolved: oracle.unresolved(carried),
      }));
      if (answer instanceof Error) {
        return stop(
          "error",
          undefined,
          `branch oracle could not read ${oracle.carried} from ${label}: ${answer.message}`,
        );
      }
      if (answer.broken) return stop("failed", "branch_contract", `${label} ${answer.broken}`);
      unresolved = legRecord.unresolved = answer.unresolved;
      if (!unresolved.length) return phaseRecord;
    }

    const count = `${unresolved!.length} input${unresolved!.length === 1 ? "" : "s"}`;
    const next = plan.sentinel
      ? `the next step, ${plan.sentinel}, needs a person`
      : "no leg is left to try";
    return stop(
      "blocked",
      undefined,
      `${plan.skill} left ${count} unresolved after ${plan.legs.at(-1)!.skill}: ${unresolved!.join(", ")}; ${next}`,
    );
  };

  let budgetSpent = false;
  for (let trialNumber = 1; trialNumber <= options.trials && !budgetSpent; trialNumber++) {
    const trialDir = path.join(runDir, `trial-${padded(trialNumber)}`);
    mkdirSync(trialDir);
    const promoted: Promoted = new Map(seeded.map((artifact) => [artifact.record.id, artifact]));
    const trial: PipelineTrialRunRecord = { trial: trialNumber, status: "passed", phases: [] };
    // Shared by the trial's loop iterations, so a wrapper one call fetched is there for the next.
    let cacheDir: string | undefined;

    for (const plan of phasePlans) {
      const phase = plan.phase;
      const phaseRunDir = path.join(trialDir, `phase-${padded(phase.phase)}-${plan.skill}`);
      const entryPlan = "legs" in plan ? plan.legs[0]! : plan;
      const scenarioInput =
        entryPlan === workerPlans[0] && phase.phase === firstPhase ? fixturePath : null;
      const inputs = staged(entryPlan, promoted, scenarioInput);
      let phaseRecord: PipelinePhaseRunRecord;
      const spent = spentBudget(record.usage, options);
      if (spent) {
        phaseRecord = {
          phase: phase.phase,
          skill: plan.skill,
          status: "cancelled",
          failure_kind: "budget",
          error: `run budget spent before phase ${phase.phase}: ${spent}`,
          run_dir: relative(phaseRunDir),
          declared_input_ids: entryPlan.consumes,
          resolved_inputs: inputs.resolved,
          missing_input_ids: inputs.missing,
          artifacts: [],
        };
      } else if ("legs" in plan) {
        phaseRecord = await runBranch(plan, phaseRunDir, promoted);
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
          skill: plan.skill,
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

/** 0 for a passed run, 2 for one that needs a person, 1 otherwise. */
export function testPipelineExitCode(status: PipelineRunRecord["status"]): number {
  return status === "passed" ? 0 : status === "blocked" ? 2 : 1;
}

export async function runTestPipelineCommand(argv = process.argv.slice(2)): Promise<void> {
  const args = parseTestPipelineArgs(argv);
  const repoRoot = path.resolve(args.root ?? process.cwd());
  const runDir = path.resolve(args.runDir ?? defaultTestPipelineRunDir(args.pipeline));
  const record = await runLinearPipeline({ ...args, repoRoot, runDir });
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  process.exitCode = testPipelineExitCode(record.status);
}
