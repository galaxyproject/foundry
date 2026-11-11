---
type: mold
name: discover-shed-tool
axis: target-specific
target: galaxy
tags:
  - target/galaxy
status: reviewed
created: 2026-04-30
revised: 2026-11-11
revision: 7
summary: "Search the Tool Shed for an existing wrapper, drill from hit to a pinnable changeset, classify candidates, and recommend or fall through."
output_artifacts:
  - id: galaxy-tool-pin
    kind: json
    default_filename: galaxy-tool-pin.json
    schema: "[[galaxy-tool-discovery]]"
    description: "(owner, repo, tool_id, version, changeset_revision) pin for a Tool Shed wrapper plus discovery classification."
related_notes:
  - "[[component-tool-shed-search]]"
  - "[[galaxy-efficient-tool-substitutions]]"
references:
  - kind: research
    ref: "[[galaxy-efficient-tool-substitutions]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Swap a named tool for its lower-cost Galaxy replacement before searching, unless an opt-out holds."
    verification: "Run discover-shed-tool on a need naming fastqc and confirm it pins iuc~falco~falco with an efficient-substitution warning, and on a need with fastq.bz2 input and confirm it keeps devteam/fastqc."
  - kind: cli-command
    ref: "[[tool-search]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: corpus-observed
    purpose: "Search the Tool Shed for candidate wrappers matching a step's tool need."
    trigger: "When resolving a workflow step to an installable Galaxy tool wrapper."
  - kind: cli-command
    ref: "[[tool-versions]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: corpus-observed
    purpose: "List available Tool Shed versions for a selected candidate."
    trigger: "After a Tool Shed search candidate is selected and before pinning a version."
  - kind: cli-command
    ref: "[[tool-revisions]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: corpus-observed
    purpose: "Resolve a Tool Shed tool version to an installable changeset revision."
    trigger: "After selecting a candidate version that needs a reproducible changeset pin."
  - kind: schema
    ref: "[[galaxy-tool-discovery]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Validate the hit, weak, or miss recommendation emitted by Tool Shed discovery."
    verification: "Run discover-shed-tool against known FastQC, ambiguous BWA-style, and no-hit queries and validate each emitted recommendation."
  - kind: research
    ref: "[[component-tool-shed-search]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Explain Tool Shed search/indexing limitations that affect hit scoring and fallthrough decisions."
    trigger: "When results are missing, weak, duplicated across owners, stale, or ambiguous."
---

# discover-shed-tool

Discover whether the Galaxy Tool Shed already publishes a wrapper for the tool a workflow step needs, and resolve the discovery to a `(owner, repo, tool_id, version, changeset_revision)` quintuple that downstream steps can pin and cache.

This Mold is the **Tool Shed leg** of the `discover-or-author` branch in Galaxy-targeting per-step pipelines. On a hit, the cast skill recommends a pin and exits successfully. On a miss, it falls through to [[author-galaxy-tool-wrapper]]. The branch itself is harness logic; this Mold owns only the discovery half.

## Inputs

The Mold expects, per step:

- A free-text **need** describing what the step should do (typically a one-line description of the tool, plus any constraints — file format in/out, container language, license preferences). It names the source executable when there is one.
- Optional **owner hint** (e.g. `devteam`, `iuc`) when the caller has a strong prior.
- Optional **exact-name hint** when the caller knows the canonical XML id.

## Outputs

A structured recommendation object, JSON-shaped:

```json
{
  "status": "hit",
  "candidate": {
    "tool_shed_url": "https://toolshed.g2.bx.psu.edu",
    "owner": "iuc",
    "repo": "falco",
    "tool_id": "falco",
    "trs_tool_id": "iuc~falco~falco",
    "version": "1.3.2+galaxy0",
    "changeset_revision": "219ffa24f789",
    "score": 0,
    "matched_terms": ["fastqc"],
    "match_fields": ["substitution_table"],
    "rationale": "need names fastqc; the substitution table pins iuc/falco and no opt-out applies"
  },
  "alternates": [
    {
      "tool_shed_url": "https://toolshed.g2.bx.psu.edu",
      "owner": "devteam",
      "repo": "fastqc",
      "tool_id": "fastqc",
      "trs_tool_id": "devteam~fastqc~fastqc",
      "version": "0.74+galaxy1",
      "changeset_revision": "2c64fded1286",
      "score": 0,
      "matched_terms": ["fastqc"],
      "match_fields": ["substitution_table"],
      "rationale": "the replaced tool, pinned so the caller can reverse the swap"
    }
  ],
  "rationale": "efficient substitution of fastqc by falco; latest version pinned to newest changeset",
  "warnings": [
    {
      "code": "efficient-substitution",
      "message": "replaced devteam/fastqc with iuc/falco per the efficient substitution table"
    }
  ]
}
```

`status` semantics:
- `hit` — recommend pinning. Caller should cache and proceed.
- `weak` — candidate exists but the cast skill is not confident (e.g. only help-text matched, multiple owners with similar tools, deprecated repo, stale-index suspicion). Caller confirms the candidate before pinning; it never falls through to authoring.
- `miss` — no wrapper runs the executable or operation the need names. Caller falls through to [[author-galaxy-tool-wrapper]].

Classify on what a wrapper runs, not on fit. Fit depends on the step's ports, which discovery doesn't see, and [[implement-galaxy-tool-step]] checks it after summarize. A wrapper that runs the named executable is never a `miss`.

## Procedure

The cast skill follows the gxwf-shaped discover-and-pin chain. **It does not call the Tool Shed HTTP API directly** — the TS CLI wraps the call sequence and gotchas covered in [[component-tool-shed-search]].

### 0. Check the substitution table

Before searching, match the need, its executable, and any exact-name or pinned `tool_id` against the table in [[galaxy-efficient-tool-substitutions]]. On a match, check that row's opt-out conditions against what the need says about inputs, settings, and downstream consumers. If none holds, skip the search, take the replacement's exact owner and repository from the row, and continue at step 3. Emit the result as a `hit` with an `efficient-substitution` warning whose message names the replaced tool and its pin, and list the original wrapper's resolved pin in `alternates` so the caller can reverse the swap. If an opt-out holds, discover the original tool as usual and name the opt-out in `rationale`.

### 1. Search

Issue [[tool-search]] with the need's keywords, and with the executable when the need names one. Start narrow:

```
gxwf tool-search "<keywords>" --json --max-results 10
```

If an owner hint is present, add `--owner <owner>`. If an exact-name hint is present, add `--match-name`. Lowercase the query (the tool index does not lowercase, see [[component-tool-shed-search]] §6).

**Normalize a tool-id-shaped need before searching.** A caller (e.g. a template `_plan_context` that guessed a candidate) may hand this Mold an XML-id token rather than a human name — `iuc/integron_finder`, `integron_finder`. The lexical index does **not** reliably match the underscored token: `tool-search integron_finder` returns no hits while `integron finder` and `integron` both score. So derive query variants instead of feeding the token verbatim: strip any `owner/` prefix, split on `_` / `-` into space-separated words, and also try the bare significant word. A `miss` is only honest after the name variants have been tried — a no-hit on the raw underscored token alone is a search artifact, not evidence the tool is absent.

### 2. Triage hits

For each hit, score on:
- **Name match.** Exact match on `toolId` or `name` is a strong signal; help-only matches are weak.
- **Owner reputation.** `iuc` and `devteam` repos are typically maintained; an unfamiliar owner with a single-tool repo is a weaker prior. (No machine-readable approval flag exists — the Tool Shed's `approved` field is dead code.)
- **Recency.** Recent `last_updated` strengthens a hit; very old wrappers can still be valid but warrant the `weak` classification.
- **Duplicates across repos.** Two owners can publish wrappers with the same XML id. Either pick the maintained one or downgrade to `weak` and surface the choice.

Drop data-manager hits (usually `data_manager_*` repos): they're admin-only and write a tool data table, not a dataset a step can consume. Drop hits from deprecated repos when detectable. Note: deprecated repos can still appear in shed search results until the next index rebuild — see [[component-tool-shed-search]] §6.

### 3. Resolve to a pinnable version

For the top candidate, list versions:

```
gxwf tool-versions <trsToolId> --json
```

Pick the newest installable version unless the need specifies otherwise (rare: a workflow may pin to a specific historical version for reproducibility). Be aware that **TRS dedupes by version string** — multiple changesets may publish the same version, and only one is visible at this layer.

### 4. Resolve to a changeset

Drill from `(trsToolId, version)` to a concrete changeset:

```
gxwf tool-revisions <trsToolId> --tool-version <v> --latest --json
```

Prefer `--latest` so the newest changeset publishing that version wins (tool versions are not monotonic; two changesets can legally publish the same version with different content). The output's `changesetRevision` is what lands in the workflow's `tool_shed_repository.changeset_revision` for reproducible reinstall.

### 5. Classify and emit

Combine the scored hit and the resolved pin into the recommendation object above:
- One dominant hit + clean version+changeset resolution → `hit`.
- Multiple plausible hits, ambiguous owner, deprecated suspicion, or only-help-text match → `weak` with the leading candidate plus alternates.
- No wrapper runs what the need names → `miss`.

Validate the recommendation with `validate-galaxy-tool-discovery` before returning it. Do not rely on prose-only shape checks; downstream phases branch on this contract.

## Caveats baked into the procedure

The procedure assumes — and the cast skill must surface in its rationale when relevant — the following Tool Shed realities (full detail in [[component-tool-shed-search]] §6):

- **Indexes are stale by design.** A freshly published tool may not appear; a deprecated tool may still appear. Treat absence as soft evidence, not proof.
- **Wildcard `*term*` wrapping** disables stemming; spelling matters. Try alternate phrasings before declaring `miss`. In particular an underscored or owner-prefixed **tool-id token** (`integron_finder`, `iuc/integron_finder`) can score zero where the **human name** (`integron finder`) hits — never declare `miss` on a single id-token query (see §1 normalization).
- **No EDAM in shed search** — semantic queries that work in Galaxy's installed-toolbox search will not work here. Stick to lexical name/keyword queries.
- **Same XML id across repos.** Hits collapse only on `(repoName, owner)`; expect duplicates that need triage.
- **Repo-level discovery is a different surface.** For "find me the *package* that contains a tool about X" with server-side `owner:` / `category:` keywords, `gxwf repo-search` is the right command — out of scope for this Mold but a known sibling.

## Non-goals

- **Authoring.** This Mold never produces a tool wrapper. On `miss`, the harness's `discover-or-author` branch fall-through invokes [[author-galaxy-tool-wrapper]].
- **Caching.** This Mold emits a pin recommendation. The caller (or the next phase) runs `galaxy-tool-cache add toolshed.g2.bx.psu.edu/repos/<owner>/<repo>/<tool_id> --tool-version <v>` to populate the cache.
- **Galaxy-instance discovery.** Hitting a running Galaxy server's installed-tool index (EDAM-aware, panel-aware) is a different mechanism — the future `discover-tool-via-galaxy-api` Mold. The contrast is sketched in [[component-tool-shed-search]] §4.
- **Test-data resolution.** Out of scope; handled by the `test-data-resolution` branch elsewhere in the pipeline.
