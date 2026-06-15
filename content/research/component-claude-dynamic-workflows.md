---
type: research
subtype: component
tags:
  - research/component
component: "Claude Code dynamic workflows harness substrate evaluation"
status: draft
created: 2026-06-15
revised: 2026-06-15
revision: 1
ai_generated: true
summary: "Dynamic workflows natively solve the per-step sub-DAG loop Archon couldn't, with schema-typed step handoffs; cost is in-session-only resume and no mid-run gate."
sources:
  - "https://claude.com/blog/introducing-dynamic-workflows-in-claude-code"
  - "https://code.claude.com/docs/en/workflows"
  - "https://www.testingcatalog.com/anthropic-launches-dynamic-workflows-for-claude-code/"
---

# Claude Code dynamic workflows evaluation

Project-infrastructure research on Anthropic's **dynamic workflows** (Claude Code) as a possible Foundry
harness substrate. Companion to [[component-archon]] — same evaluation lens, different shape. Reviewed
2026-06-15 against the official blog announcement (GA 2026-05-28) and the Claude Code docs page
(`/docs/en/workflows`, requiring Claude Code `v2.1.154+`). The deepest API detail below is read directly
off the `Workflow` tool contract this Foundry session is itself running under — a primary source, but a
point-in-time one. Operational details are evidence, not promises; re-check before adopting. The blog
calls it generally available (all paid plans + API + Bedrock/Vertex/Microsoft Foundry), but it reads as
pre-1.0 in spirit: the keyword trigger already changed (`workflow` → `ultracode`) between `v2.1.154` and
`v2.1.160`.

## 1. What is it?

**Tagline (blog):** "Orchestrate subagents at scale."

**Elevator pitch (docs):** "A dynamic workflow is a JavaScript script that orchestrates subagents at
scale. Claude writes the script for the task you describe, and a runtime executes it in the background
while your session stays responsive."

**Category.** A **script-driven subagent orchestration runtime built into Claude Code** — not a separate
product, not a YAML DAG engine, not a RAG/KB system. The orchestration is plain JavaScript: Claude
authors a script whose body calls a small set of hooks (`agent()`, `parallel()`, `pipeline()`, `phase()`,
`log()`, `workflow()`) and the runtime runs it out-of-context. The defining contrast with ordinary
subagents/skills/agent-teams is **who holds the plan**: with subagents Claude decides turn by turn and
every result lands in the context window; with a workflow *the script* holds the loop, the branching, and
the intermediate results (in script variables), so Claude's context holds only the final answer. This is
the same "move the plan into code" bet the Foundry makes when it puts a Pipeline's `phases:` spine into a
machine-readable file.

**How it's invoked.**
- Natural language ("use a workflow" / "run a workflow") or the `ultracode` keyword in a prompt → Claude
  writes a one-off workflow for that task. (Literal trigger was `workflow` before `v2.1.160`.)
- `/effort ultracode` (≈ `xhigh` reasoning + automatic workflow orchestration) → Claude plans a workflow
  for *every* substantive task in the session; one request can fan into several workflows (understand →
  change → verify).
- Saved workflows run as `/<name>` commands (see §7). One bundled example ships: `/deep-research`.

**Maturity / availability.**
- GA announced 2026-05-28. Requires Claude Code `v2.1.154+`; available on all paid plans, the Anthropic
  API, and Bedrock / Vertex AI / Microsoft Foundry. On Pro, enabled from `/config`.
- Marketing proof point: a Bun port from Zig to Rust, "~750,000 lines" with test-suite validation; early
  uses cited as codebase-wide bug sweeps, security audits, hardening passes, large migrations.
- First-party, so no third-party bus-factor concern (contrast Archon's single-maintainer surface). The
  flip side is total platform binding: this lives and dies inside Claude Code.

**Stated goals.** Scale beyond what one conversation can coordinate; codify orchestration as a readable,
rerunnable script; keep the session responsive via background execution; and — emphasized as much as
scale — apply *repeatable quality patterns* (adversarial cross-review of findings, multi-angle plan
drafting weighed against each other) rather than just running more agents.

## 2. Core architecture and primitives

The vocabulary is a JS API, not a node taxonomy. Every script begins with a pure-literal `export const
meta = {name, description, phases}` block, then a script body.

**Composition model.** Imperative JavaScript. Control flow *is* the orchestration — `while`/`for`/`if`
are the loop and branch primitives, not declared node kinds. Concurrency and staging come from three
hooks:

- **`agent(prompt, opts?)`** — spawn one subagent. Returns its final text, or, when `opts.schema` (a JSON
  Schema) is supplied, a validated object — the subagent is *forced* into a structured-output tool call
  and the model retries on mismatch, so parsing never touches orchestration logic. `opts`: `label`,
  `phase`, `schema`, `model`, `isolation: 'worktree'`, `agentType` (use a custom registered subagent
  type, e.g. `Explore`, composes with `schema`).
- **`parallel(thunks)`** — run thunks concurrently, **barrier**: awaits all before returning. A thrown
  thunk resolves to `null` (never rejects the whole call), so `.filter(Boolean)` before use.
- **`pipeline(items, stage1, stage2, …)`** — run each item through all stages independently, **no
  barrier**: item A can be in stage 3 while item B is still in stage 1. Wall-clock = slowest single-item
  chain, not sum-of-slowest-per-stage. This is the default multi-stage shape.
- **`phase(title)`** / **`log(msg)`** — progress grouping and a narrator line in the `/workflows` view.
- **`workflow(nameOrRef, args?)`** — run another (saved or scripted) workflow inline as a sub-step;
  nesting is **one level only**.
- **`args`** — the invocation input, verbatim, as a global (structured, no parsing).
- **`budget`** — `{total, spent(), remaining()}`; a hard token ceiling from the user's "+Nk" directive,
  usable to scale fan-out or loop-until-budget. `total` is `null` when unset.

**Handoff between steps.** The `schema` option is the headline Foundry-adjacent primitive: a JSON Schema
attached to an `agent()` call defines the *typed contract of that step's output*, validated at the
tool-call layer with automatic retry. This is structurally the same idea as the Foundry's Mold IO schemas
(`summary-nextflow`, the Galaxy tool summary schema) — a typed handoff between stages — but enforced at
*orchestration runtime* over agent output, not cast into a bundle as content. (See §10 for why this is an
overlap, not an equivalence.)

**State / execution.** The runtime executes the script in an isolated environment separate from the
conversation; intermediate results stay in script variables. The script itself has **no direct filesystem
or shell access** — agents do all IO; the script only coordinates them. Runs execute in the background;
`/workflows` shows phases with agent counts, token totals, elapsed time, and per-agent drill-down, with
pause/resume/stop/restart controls.

**Restricted JS.** `Date.now()`, `Math.random()`, and argless `new Date()` **throw** (they would break
deterministic resume). Timestamps come in via `args` or are stamped after the run; randomness is faked by
varying prompt/label by index. Standard built-ins (JSON, Math, Array) otherwise available; no Node APIs.

**Caps.** Up to **16 concurrent agents** (fewer on low-core machines: `min(16, cores−2)`); **1,000 agents
total per run** (runaway backstop); a single `parallel()`/`pipeline()` call takes **at most 4,096 items**.

## 3. Tech stack and deployment

- **Substrate:** built into Claude Code; no separate install, server, or DB. Runs wherever Claude Code
  runs — CLI, Desktop app, IDE extensions, `claude -p` headless, and the Agent SDK.
- **Script language:** plain JavaScript (NOT TypeScript — type annotations, interfaces, generics fail to
  parse). Async context; `await` directly.
- **Persistence:** every run writes its script to a file under the session dir in `~/.claude/projects/`;
  the path is returned to Claude at launch (readable, diffable, editable-and-relaunchable). The runtime
  journals each agent's result for in-session resume. There is **no cross-session durable store** — see §8.
- **Config / disable:** `/config` toggle, `"disableWorkflows": true` in settings, or
  `CLAUDE_CODE_DISABLE_WORKFLOWS=1`; org-wide via managed settings / admin page.
- **Permissions:** the launch prompt respects permission mode (Default/accept-edits prompt per run unless
  "don't ask again"; Auto prompts first-launch only; Bypass/`-p`/SDK never prompt). Spawned subagents
  **always run in `acceptEdits`** and inherit the session tool allowlist regardless of session mode;
  non-allowlisted shell/web/MCP calls can still prompt mid-run.

## 4. Skill / tool integration model

This is where fit with Foundry casts is decided.

- **Casts are consumed, not declared.** There is no per-stage `skills:` array (Archon's model). A
  workflow orchestrates *agents*; each agent inherits the session's skills/tools and can invoke a
  generated skill the same way any Claude turn would. To specialize an agent, `opts.agentType` selects a
  registered subagent type. So a Foundry cast (a Claude skill) is reached by an agent inside a stage, not
  wired into the workflow graph — a clean boundary, identical in spirit to Archon's "casting lives
  outside the harness."
- **MCP / external tools.** Workflow agents reach all session-connected MCP tools via `ToolSearch`
  (schemas load on demand per agent). Caveat in the tool contract: interactively-authenticated MCP
  servers may be absent in headless/cron runs.
- **CLI tools (`gxwf`, `planemo`, `gh`).** Reached by an agent running a shell command — the script can't
  shell out itself. An agent wraps the CLI call and returns its result (ideally under a `schema`), and the
  next stage consumes it. This is the integration point for the Foundry's validate/test/lint/run actions.
- **Reuse.** A run's script is saveable as a `/<name>` command (project `.claude/workflows/` or personal
  `~/.claude/workflows/`); `args` parameterizes it. The saved script is the durable contract — the analog
  of Archon's portable YAML.

## 5. Orchestration features

| Feature | Dynamic workflows support |
|---|---|
| Sequencing / DAG | Imperative JS — sequence is statement order; "DAG" is whatever the `await` graph implies. `pipeline()` for staged streaming, `parallel()` for barriered fan-out. |
| Conditional branching | Native JS `if`/`switch` over prior results (often schema-validated structured output). No DSL ceiling — arbitrarily complex routing is just code. |
| Routing | Code-level. A discover-or-author branch is `const r = await agent(..., {schema}); if (r.found) … else …` — no `when:`-expression evaluator to outgrow. |
| Looping / per-item iteration | **Native and first-class.** `pipeline(items, …stages)` runs a *sub-DAG per item* with no barrier; `while`/`for` express loop-until-count, loop-until-dry, loop-until-budget. This is the exact primitive Archon lacked. |
| Approval gates / HITL | **Weakest axis.** "No mid-run user input"; only agent permission prompts pause a run. For sign-off between stages the docs say: run each stage as its own workflow. No `approval:` node, no interactive loop. |
| Retry / failure | `agent()`/thunk failure resolves to `null` (filter it); `schema` retries on validation mismatch; broader retry is hand-coded (`while`/try-catch). No declarative per-node `retry:` with backoff. |
| State persistence and resumption | In-session only. Journaled agent results → resume returns cached results for the unchanged script prefix, reruns from the first edited/new `agent()` call (`resumeFromRunId`). **Exit Claude Code and a running workflow starts fresh next session.** |
| Observability / tracing | `/workflows` TUI: per-phase agent counts, token totals, elapsed time, per-agent prompt/tool-calls/result drill-down; task-panel one-line summary. First-party, no DB to stand up. |
| Cost tracking | Per-agent token usage in `/workflows`; `budget.spent()/remaining()` in-script (shared pool across main loop + workflows); agent caps bound worst-case. No per-agent USD cap (contrast Archon's `maxBudgetUsd`). |
| Concurrency | `min(16, cores−2)` concurrent agents per workflow; excess queues. |
| Worktree isolation | Opt-in per agent via `opts.isolation: 'worktree'` (expensive; auto-removed if unchanged) — for agents that mutate files in parallel. Not default (contrast Archon's worktree-by-default). |

## 6. Knowledge base / RAG features

**No KB**, same verdict as Archon. The runtime coordinates agents; it has no corpus, vector store, or
retrieval primitive. Agents reach a KB only by reading files or calling an MCP/retrieval tool. For the
Foundry's patterns and IWC exemplars the answer is unchanged: keep them on the filesystem and let agents
grep/read, or expose them via MCP. Dynamic workflows is the **wrong shape to host** the Foundry KB and the
**right shape to consume** it through agents.

## 7. Extensibility and customization

- **The script is the extension point**, and it's a general-purpose programming language — strictly more
  expressive than a YAML node schema. Anything you can express as JS control flow over agent calls is in
  scope without forking an engine. The flip side: no declarative node library to lean on; quality patterns
  (adversarial verify, loop-until-dry, judge panel) are *idioms you write*, not nodes you configure
  (though the tool contract documents canonical shapes for each).
- **Saved workflows** are the reuse unit — a Foundry harness would be one saved `/<name>` workflow under
  `.claude/workflows/`, parameterized by `args`. Project workflows shadow personal ones of the same name.
- **`workflow()` composition** lets a harness call sub-harnesses inline (one level deep) — e.g. a
  pipeline-level workflow invoking a per-phase workflow.
- **No new-primitive plugin surface needed** — because the primitive is "write JS," there's nothing to
  fork. Contrast Archon, where a `for_each:` node would mean forking `@archon/workflows`.

## 8. Failure modes and limitations

- **No mid-run human gate.** The single sharpest mismatch with Foundry harness design. The Foundry's
  reserved `[gate]` phase kind (inline approval / scope confirmation) cannot be a pause *inside* a
  workflow — the documented pattern is to split the journey into multiple workflows with user sign-off
  *between* them. Workable, but it fragments a single conversational journey into N launches.
- **In-session ephemerality.** Resume works only within the same Claude Code session; exiting mid-run
  loses the run. Archon's DB-backed cross-process resume is materially stronger for long, interruptible,
  fire-and-forget jobs. Dynamic workflows is built for "stay in the session while it runs in the
  background," not "kick it off and come back tomorrow."
- **No platform adapters / multi-user.** No Slack/Telegram/Discord/GitHub-webhook triggering, no
  multi-tenancy. It's a single-developer-in-Claude-Code tool. (Archon's adapter layer is its product
  surface; this has none.)
- **Total platform binding.** The orchestration contract is a Claude Code runtime API, not a portable
  spec. The *saved script* is plain JS and readable, but it only runs inside Claude Code's workflow
  runtime — there is no extraction path to a generic executor the way Archon's YAML could in principle be
  reimplemented. Lock-in is to a vendor runtime, not a schema.
- **Pre-1.0 churn despite "GA".** Trigger keyword already changed (`workflow` → `ultracode`); the script
  API is young. Treat the API surface as moving.
- **Scripting foot-guns.** JS-not-TS; `Date.now()`/`Math.random()`/argless `new Date()` throw; barrier vs
  no-barrier (`parallel` vs `pipeline`) is a real correctness distinction; dedup-against-seen vs
  dedup-against-confirmed in loop-until-dry is an easy convergence bug. These are authoring hazards, not
  runtime defects, but a generated harness has to get them right.
- **No KB / retrieval** (see §6).
- **Cost.** A run spawns many agents and "can use meaningfully more tokens." First trigger requires
  confirmation; caps bound the worst case; the advice is to pilot on a slice first.

## 9. Roadmap and trajectory

First-party and freshly GA, so trajectory is Anthropic's to set, not a community project's. Signals: a
bundled `/deep-research` workflow; `ultracode` as an automatic-orchestration effort level; surfaces across
CLI / Desktop / IDE / headless / SDK; managed-settings org controls. Direction reads as *deepening
orchestration inside Claude Code* (more bundled workflows, the save-as-command path, quality-pattern
idioms) rather than growing into a standalone product, KB, or cross-session job runner. The mid-run-gate
and cross-session-resume gaps look like deliberate scope choices ("run each stage as its own workflow"),
not unshipped features — don't assume they'll close.

## 10. Concrete fit assessment for harnesses

Re-read against the same Foundry harness requirements used for [[component-archon]].

**What dynamic workflows covers off-the-shelf — including Archon's gap:**
- **Per-step looping over a sub-DAG — the headline.** A `[loop]` phase that runs once per step in the
  workflow being built is the *exact* thing Archon could not express natively and had to fake with the
  Ralph plan-on-disk pattern (see [[component-archon]] §8/§10). Here both shapes the Foundry uses are
  native one-liners. The Galaxy spine has already collapsed its per-step loop into a single orchestrator
  Mold (`[loop] advance-galaxy-draft-step`, per `docs/HARNESS_PIPELINES.md`), so its loop is a plain
  `while (await advance()).draft { … }` — the orchestrator owns the inner sequencing, and `pipeline()`'s
  no-barrier streaming buys little. The CWL spine keeps a genuine multi-stage per-step loop
  (`[loop] summarize-cwl-tool → implement-cwl-tool-step → validate-cwl`), and *that* is the one-line
  `pipeline(steps, summarizeTool, implementStep, validate)` — each step flowing through the sub-DAG
  independently, no barrier, validation streaming per step. Either way the per-item-sub-DAG capability that
  drove the entire Archon caveat is native, not a workaround. This is the strongest reason to look at
  dynamic workflows over Archon.
- **Schema-typed handoffs between phases.** `agent(prompt, {schema})` enforces a typed output contract per
  stage with retry — the orchestration-layer cousin of Foundry Mold IO schemas. A harness can carry the
  same typed-handoff discipline the Foundry already values, at runtime, without bespoke parsing.
- **Branching / routing without a DSL ceiling.** The discover-or-author branch is `if (r.found)` over a
  schema-validated `agent()` result — no `when:`-expression evaluator to outgrow.
- **Sequencing + parallel quality passes.** `parallel()` fan-out for multi-reviewer / adversarial-verify
  stages; the docs explicitly pitch "agents adversarially review each other's findings" and "draft a plan
  from several angles" as first-class patterns. Directly useful for a validate-and-cross-check phase.
- **Background execution + observability.** Runs in the background with a first-class `/workflows` TUI
  (counts, tokens, elapsed, per-agent drill-down) — comparable to Archon's event log + step viewer, with
  zero infra to stand up.
- **Casting boundary stays clean.** Agents consume Foundry casts; the workflow never compiles a Mold.
  Same boundary as Archon.

**What requires custom handling or doesn't fit:**
- **Mid-pipeline user gates.** The Foundry's harness-owned approval / scope-confirmation checkpoints have
  no in-workflow representation. You either split the journey at each gate into separate workflows (extra
  launches, user sign-off between them) or accept a fully autonomous run with confirmation only at launch.
  This is *more* restrictive than Archon's `approval:` nodes and interactive loops — the one axis where
  Archon is clearly better.
- **Cross-session / long-horizon resumption.** Fine for a journey that completes inside one session;
  inadequate if a Foundry run must survive closing the laptop. Pair with external state, or keep runs
  session-scoped.
- **Pattern / IWC-exemplar retrieval.** Filesystem-grep-by-agent or MCP, same as Archon. Not the
  workflow's job.
- **Harness portability.** If the Foundry ever wants a harness that runs *outside* Claude Code, this
  isn't it — the script only runs in Anthropic's runtime.

**Interactive vs. unsupervised posture.** More firmly **unsupervised-by-construction** than Archon. Archon
is "fire-and-forget by default, but HITL is expressible." Dynamic workflows is "fire-and-forget,
full stop, until the run ends" — HITL only exists as the *boundary between* workflows, never inside one.
For the Foundry's current pipeline spine — a Mold sequence with harness-owned checkpoints *around* it, no
inline `[gate]` yet — this is an acceptable posture: model each gate as a workflow boundary.

**Head-to-head with Archon.** They sit at different points:
- **Expressiveness of control flow:** dynamic workflows wins decisively (real loops/branches/sub-DAGs vs
  Archon's DAG + Ralph-pattern workaround).
- **Typed step handoffs:** dynamic workflows wins (`schema` per stage is native and ergonomic).
- **In-pipeline HITL gates:** Archon wins (`approval:` nodes, interactive loops).
- **Durable cross-process / cross-session resume:** Archon wins (DB-backed).
- **Platform reach / multi-surface triggering:** Archon wins (adapters); dynamic workflows is
  Claude-Code-only.
- **Infra cost to adopt:** dynamic workflows wins (zero — it's already in Claude Code).
- **Portability of the harness contract:** a wash with different failure modes — Archon's YAML is
  reimplementable in principle but tied to a pre-1.0 engine; the workflow script is readable JS but bound
  to Anthropic's runtime.

The wider alternatives field (LangGraph, Temporal/Inngest, CrewAI/AutoGen, plain Anthropic-SDK harness,
skills-only) is surveyed in [[component-archon]] §11; the same assessment applies, with dynamic workflows
added as a now-available first-party option that lands between "plain-SDK harness" (more expressive,
zero-infra) and "skills-only" (no orchestration loop) on that spectrum.

**Concrete recommendation.** **Prototype the Foundry's per-step loop as a saved dynamic workflow first —
it is the cheapest way to validate the hardest part of the harness.** The per-item sub-DAG that drove the
entire Archon caveat is native here, and schema-typed handoffs come for free. The CWL spine is the better
pilot than Galaxy precisely because its per-step loop is still multi-stage (`summarize-cwl-tool →
implement-cwl-tool-step → validate-cwl`), exercising `pipeline()` for real rather than a plain `while`.
Author a saved `/<name>` workflow under `.claude/workflows/` that (a) summarizes a source via an
`agent({schema})` stage, (b) `pipeline()`s the per-step CWL tool loop over the draft steps (or, on the
Galaxy spine, a plain `while draft` around the `advance-galaxy-draft-step` orchestrator), (c) runs
`gxwf`/`planemo` through agent-wrapped shell calls with schema'd results, and (d) ends with a
`parallel()` adversarial-validate pass. Accept the no-mid-run-gate constraint up front: model the Foundry's approval/scope checkpoints as
*workflow boundaries* — a `summarize` workflow, then (after user sign-off) a `build` workflow, then a
`verify` workflow — rather than inline gates. Keep casting and pattern/IWC retrieval outside the workflow,
exactly as for Archon. Do **not** build durable cross-session state on this runtime; if a Foundry run must
survive a session exit, that state lives elsewhere.

The honest framing relative to Archon: **dynamic workflows is the better fit for the Foundry's
control-flow-heavy per-step pipeline and its typed-handoff instinct; Archon is the better fit if inline
human gates and durable, platform-triggered, fire-and-forget runs are hard requirements.** Given the
current Foundry pipeline spine (Mold sequence, harness checkpoints around it, no inline `[gate]` yet, and
a strong typed-IO culture), dynamic workflows is the more natural first substrate to pilot — with the
explicit caveat that the inline-gate story is a regression from Archon and worth re-checking if `[gate]`
phases ever become load-bearing.

## 11. Does this belong in `docs/COMPARISONS.md`?

**Recommendation: no — it belongs here as component research, alongside [[component-archon]], not in
COMPARISONS.** Reasoning:

- **COMPARISONS is a single axis: *when the knowledge base meets the skill* — runtime retrieval vs
  compile-time-with-provenance.** Every Part B entry (MCP, Agent Skills, llms.txt, Corpus2Skill, Pinecone
  Nexus, OpenAPI→tool, Voyager, RAG, Custom GPTs) is a KB→skill *bridging* approach. Dynamic workflows is
  not on that axis at all — it is a *harness / orchestration runtime* that *consumes* casts. It competes
  with Archon, LangGraph, Temporal, plain-SDK harnesses — none of which are in COMPARISONS, because the
  harness-substrate question is tracked exactly here, in `content/research/component-*`.
- **Precedent is explicit.** Archon — the other harness substrate — is component research, deliberately
  *not* a COMPARISONS entry. Putting dynamic workflows in COMPARISONS would split the harness-substrate
  evaluation across two docs with two different decay disciplines.
- **The one genuine overlap is narrow.** The `schema`-typed handoff between stages rhymes with the
  Foundry's Mold IO schemas, and that *is* Foundry-adjacent. But it's an orchestration-runtime feature
  (validate agent output at runtime), not a KB→skill compile feature (cast curated content into a bundle).
  It does not change the layer dynamic workflows lives at.

**COMPARISONS treatment (done):** the only change made to `docs/COMPARISONS.md` is a one-line scope note
at the end of "Where the Foundry lands" — that the doc tracks the KB→skill axis only, and the adjacent
*which-harness-runs-the-casts* question (Archon, Claude Code dynamic workflows, LangGraph, …) is evaluated
under `content/research/component-*`. That pointer names this note's subject explicitly and pre-empts the
"why isn't dynamic workflows in here?" reader. No Part B entry is added; COMPARISONS stays strictly on its
KB→skill axis.
