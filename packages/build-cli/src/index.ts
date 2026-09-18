export { runAssemblePipelineCommand } from "./commands/assemble-pipeline.js";
export { runCastMoldCommand } from "./commands/cast-mold.js";
export { runGenerateDashboardCommand } from "./commands/generate-dashboard.js";
export { runGenerateIndexCommand } from "./commands/generate-index.js";
export { runTestSkillCommand } from "./commands/test-skill.js";
export {
  runPiTestAuthCommand,
  type PiTestAuthCommandDependencies,
  type PiTestAuthCommandManager,
} from "./commands/pi-test-auth.js";
export {
  defaultTestPipelineRunDir,
  runLinearPipeline,
  runTestPipelineCommand,
  type PipelinePhaseRunRecord,
  type PipelineRunRecord,
  type PipelineRunnerDependencies,
  type PipelineTrialRunRecord,
  type TestPipelineOptions,
} from "./commands/test-pipeline.js";
export {
  runValidateCommand,
  validateData,
  validateDirectory,
  type ValidateOptions,
} from "./commands/validate.js";
export { readMarkdown, normalizeDates, type ParsedFile } from "./lib/frontmatter.js";
export {
  parsePhases,
  phaseMoldPaths,
  type ParsedPhase,
  type ParsedMoldPhase,
  type ParsedBranchPhase,
  type ParsedUnknownPhase,
  type ParsedBranchItem,
  type ParsedPhases,
  type PhaseFinding,
} from "./lib/pipeline-phases.js";
export { loadTagRegistry, type TagRegistry } from "./lib/schema.js";
export { fileSlug, findMdFiles } from "./lib/walk.js";
export { resolveWikiLink, slugify, stripBrackets, WIKI_LINK_RE } from "./lib/wiki-links.js";
export { runRunDashboardCommand, parseRunDashboardArgs } from "./commands/run-dashboard.js";
export {
  declaredOutputs,
  listPipelineSlugs,
  loadAllAssemblies,
  loadAssembly,
  loadSkillProvenance,
  phaseSkills,
  type AssemblyManifest,
  type AssemblyPhase,
  type DeclaredOutput,
  type SkillProvenance,
} from "./lib/cast-registry.js";
export {
  buildRunModel,
  serializeRunManifest,
  RunRecordMissingError,
  type BuildRunModelOptions,
  type SiteLinker,
} from "./lib/run-manifest.js";
export {
  buildPipelineIndex,
  detectPipeline,
  scorePipelines,
  PipelineUndeterminedError,
  type PipelineCandidateScore,
  type PipelineDetection,
} from "./lib/run-reconstruct.js";
export { createSiteLinker, DEFAULT_SITE_BASE } from "./lib/run-links.js";
export {
  isTestPipelineRunDir,
  runModelFromTestPipeline,
  type TestPipelineAdapterOptions,
} from "./lib/run-adapter-test-pipeline.js";
export { parseGitLog, parseCommitSubject, type GitExec } from "./lib/run-git.js";
export { classifyEntries, variantParent } from "./lib/run-classify.js";
export { parseRunRecord, readRunRecord, RUN_RECORD_FILENAME } from "./lib/run-record.js";
export { renderRunDashboard, GENERATOR_MARKER } from "./render/run-dashboard-html.js";
export * from "./lib/run-model.js";
