# @galaxy-foundry/nfcore-tool-lab

Preparation and credential-free staging of an already converted nf-core Galaxy tool for the
experimental [tools-iwc-lab](https://github.com/galaxyproject/tools-iwc-lab)
repository. `prepare` is a mechanical, offline operation with no model, checkout,
network access, or credentials. `stage` adds an opt-in local validation controller
with Planemo/Galaxy execution and a read-only destination snapshot. Neither command
converts Nextflow, opens a PR, or deploys to a Tool Shed.

## CLI

After publication, install with `npm install -g @galaxy-foundry/nfcore-tool-lab`,
or run `npx --package @galaxy-foundry/nfcore-tool-lab nfcore-tool-lab prepare ...`.
In a Foundry checkout, build and run without publishing:

```sh
pnpm --filter @galaxy-foundry/nfcore-tool-lab build
node packages/nfcore-tool-lab/dist/bin/nfcore-tool-lab.js prepare \
  --input ./conversion \
  --output ./staging/seqkit/stats \
  --metadata ./lab-metadata.json
```

The input contains `tool.xml`, `macros.xml`, and the converter's `_provenance.yml`.
Use `--tool-file seqkit_stats.xml` for an older explicitly named wrapper.
Metadata is caller-supplied JSON, not inferred from the tool name:

```json
{
  "description": "Compute sequence statistics",
  "categories": ["Sequence Analysis"],
  "homepage_url": "https://bioinf.shenwei.me/seqkit/"
}
```

All three fields are required; unknown fields are rejected. Choose real Tool Shed
categories and the software's HTTPS homepage. The command does not verify these
claims against upstream services.

Use `--dry-run` to validate inputs and print the preparation record without writing
anything. Repeat `--asset test-data` or `--asset helper.py` to copy additional
relative files/directories. Only the three required files and explicitly selected
assets are copied, never the entire run workspace. Hidden paths, symbolic links,
non-regular files, traversal, duplicate assets, and generated-filename collisions
are rejected. Selecting assets is a trusted caller decision: the command cannot
determine whether arbitrary selected file contents contain secrets. Executable
assets retain executable permissions.

Macro imports must use safe relative filenames and resolve to a file in the
prepared package. Missing imports fail with an explicit `--asset` suggestion;
the command never automatically copies an imported file. Transitive imports are
checked too, relative to the tool directory as in Galaxy (not the importing
file's directory). Empty or unsafe paths, malformed imported XML, and import
cycles are rejected, including during dry runs. Comments, command CDATA, and
literal `<import>` elements nested in macro templates are not file imports.

The output directory must be new and outside the input tree, including through
symlinked parent paths. No in-place update or overwrite mode is provided.

## Preparation contract

Source identity comes from `_provenance.yml.nfcore_source`: `modules_repo` must be
`nf-core/modules`; `module_path` must begin with `modules/nf-core/` and contain only
lowercase alphanumeric/underscore segments starting with an alphanumeric; both
`git_sha` and `test_datasets_sha` must be full lowercase 40-character Git SHAs.
The original `generated` converter identity and `overrides` must be present.
Its `cast_artifact_sha` may be SHA-256 or YAML null; preparation neither guesses a
missing bundle identity nor independently verifies it against a conversion run.

For `modules/nf-core/seqkit/stats`:

- Destination: `galaxyproject/tools-iwc-lab:tool_collections/nf_core_modules/seqkit/stats`
- XML tool ID and Tool Shed repository name: `nfcore_compat_seqkit_stats`
- XML tool name: original name plus ` (Nextflow Module Automated Conversion)`
- Tool Shed owner: `iwc-lab`, never `iuc`

The two root attribute values are patched without XML serialization. Everything
else in the wrapper, including CDATA, command indentation, line endings, profile,
and version, stays byte-for-byte unchanged. XML must be well formed; DOCTYPEs and
custom entities are unsupported. Naming is idempotent, and an already prefixed
tool ID must match the source module. The patched XML is re-parsed to verify its
ID and name match the preparation record.

Outputs are `tool.xml`, unchanged `macros.xml` and `_provenance.yml`, selected
assets, `.shed.yml`, `README.md`, and `_publication.json`. The publication record
has schema version 1, the preparation npm package/version, pinned source,
destination, identity edits, and input/output content SHA-256 maps. Its own hash
is excluded to avoid self-reference. It has no timestamp or random ID, so equal
inputs with the same preparation version produce equal output bytes. Re-preparing
an already prepared directory preserves naming but records that directory as the
new input; it does not promise identical preparation records across that chain.

## API

```ts
import { prepareLabTool } from "@galaxy-foundry/nfcore-tool-lab";

const record = prepareLabTool({
  inputDir: "./conversion",
  outputDir: "./staging/seqkit/stats",
  metadata: {
    description: "Compute sequence statistics",
    categories: ["Sequence Analysis"],
    homepage_url: "https://bioinf.shenwei.me/seqkit/",
  },
  assets: ["test-data"],
  dryRun: false,
});
```

The API returns the same typed preparation record printed as JSON by the CLI.
CLI failures exit nonzero and write diagnostics to stderr; API failures throw.

## Credential-free staging

```sh
nfcore-tool-lab stage \
  --input ./conversion \
  --output ./staging-run \
  --metadata ./lab-metadata.json \
  --destination ./tools-iwc-lab \
  --cast-bundle ./exact-converter-bundle \
  --conversion-run ./conversion-run/run.json \
  --review ./maintainer-review.json \
  --planemo /path/to/planemo
```

`stage` is a local controller, not a second model-backed Mold. It reuses `prepare`
and runs checks even when independent review/identity gates are blocked, so a
diagnostic run can reveal multiple problems at once. `--review` is optional;
omitting it never implies licensing or coverage approval. All other inputs above
are required. `--tool-file` and repeatable `--asset` have the same meaning as in
`prepare`.

The new output directory contains:

- `package/`: the only payload proposed for the destination tool directory;
- `execution/<destination_path>/`: a byte-identical copy used for local validation,
  mirroring the destination layout so Shed lint checks the correct URL suffix;
- `evidence/`: separate stdout/stderr logs, fresh Planemo reports/configuration,
  and supplied local run/review records, never automatically included in the tool;
- `validation.json`: versioned checks, command arguments/results, payload hashes
  (including `_publication.json`), and evidence hashes;
- `review-template.json`: conversion/asset hashes and unapproved review sections,
  ready for a maintainer to fill in; no upstream case inventory is invented;
- `pr-proposal.json` and `pr-body.md`: destination/title/body for a draft PR,
  including AI-generation disclosure and the actual gate status, not a GitHub write.

Invalid preparation inputs fail before staging. An existing staging directory is
never overwritten, and staging must not overlap conversion, destination, or cast
trees. Validation failures retain useful diagnostics and the proposal but set
`ready_for_draft_pr: false`; the CLI exits 1. An all-passed run exits 0. That flag
is local draft-PR readiness, **not** merge approval or deployment permission.

### Executed gates

- Compare the unchanged provenance's converter name/revision/cast target with the
  supplied bundle's `_provenance.json`. Hash the whole supplied bundle using the
  Pi harness directory algorithm (recursive `localeCompare` ordering, relative
  POSIX filenames and file bytes, each separated by NUL); require both provenance
  `cast_artifact_sha` and the local run's `invocation.skill_sha256` to match.
- Require a passed schema-version-1 conversion run and matching path/status/SHA-256
  for the original wrapper, macros, and provenance. Legacy Mold-source hashes or
  null bundle hashes fail; the command does not repair or replace provenance.
- Inspect the supplied destination snapshot recursively for an existing target,
  duplicate tool ID, or Shed repository name, including explicit `.shed.yml`
  `repositories` names. `.git` is excluded; symlinks, invalid XML/YAML, and
  unsupported dynamic repository/suite naming block the inventory instead of
  silently ignoring it. Updates to existing destinations are not supported yet.
- Require explicit `<tests><test>` blocks, then check hash-bound human licensing
  and upstream-case coverage attestations described below. Macro-expanded test
  inventories are currently unsupported and blocked, not awarded a pass.
- Verify Planemo **0.75.47**, the version pinned by the published test-report
  schema. Run `planemo lint --fail_level warn`,
  `planemo shed_lint --ensure_metadata --fail_level warn`, and `planemo test` on the
  execution copy. Parse a fresh report with the published schema and require all
  declared prepared-tool tests, successful execution data, matching IDs/indices,
  and consistent summary counts with no errors, failures, or skips. Exit 0 or
  old conversion test reports alone cannot satisfy this gate.
- Verify every prepared payload file remains unchanged in both copies, and that
  the staged `package/` contains no unexpected files.

Commands receive a fresh empty Planemo configuration and only `PATH`, `HOME`,
temporary-directory, locale, and platform environment variables. GitHub, npm,
model-provider credentials and ambient Planemo option variables are not forwarded.
No shell expansion is used. Each command has a timeout (`--timeout-ms`, default
30 minutes) and a 4 MiB-per-stream output limit. Timeouts/cancellation terminate
the subprocess group on POSIX; Ctrl-C stops subsequent checks and retains a
blocked report. The API also accepts an `AbortSignal`.

This is **not a security sandbox**: trusted local wrappers execute code with host
filesystem/network access, and `HOME` remains available for caches. Use this
diagnostic controller only with trusted inputs. It is not an unattended
credential-bearing CI worker. Evidence may contain local paths and application
output; review it before sharing, and never copy the whole staging directory to
the destination.

By default Galaxy tests install `release_26.1` using Python **3.11**. Override with
`--galaxy-python-version 3.12`, or use `--galaxy-root` for a local development
Galaxy; do not point it at production. `--conda-prefix` selects an explicit local
dependency cache. The report records the chosen command arguments. These tests
may download source, dependencies, and remote fixtures. The local destination
snapshot and run records are consistency evidence, not authenticated upstream
attestations; refresh the snapshot and recheck collisions before a later push.

### Hash-bound review JSON

Copy the generated `review-template.json`, identify the maintainer, and review the
module/software/test-data licenses and all upstream test cases at the pinned
revision. Preserve its exact `input_sha256` map: it binds review to every selected
conversion/asset byte, including provenance and its source pins. A stale or partial
map fails both review gates. Each section can remain `needs_review` with notes.

For approval, `licensing` requires `status: "approved"`, nonempty `notes`, and an
`evidence` array covering `nf-core-module`, `wrapper`, `software`, and `test-data`.
Each entry has `component`, `license`, and `reference` strings, identifying actual
license terms and their evidence. This is a maintainer attestation, not automatic
SPDX/license eligibility verification.

Approved `coverage` requires nonempty notes and a complete, maintainer-reviewed
upstream `cases` inventory. Cases have unique `upstream_test` names and either a
zero-based `galaxy_test_index`, or `galaxy_test_index: null` plus a nonempty
`omission_reason`. Every emitted Galaxy test must be represented, and every index
must be in range. Multiple upstream cases may map to one Galaxy test; justified
omissions stay visible and are not described as executed coverage. The controller
cannot independently infer upstream inventory completeness from arbitrary nf-test
code; that remains the named reviewer's responsibility.

The separate typed API is available without importing the validation controller
into offline preparation callers:

```ts
import { stageLabTool } from "@galaxy-foundry/nfcore-tool-lab/stage";
```

It accepts preparation options plus `destinationDir`, `castBundleDir`,
`conversionRunFile`, optional `reviewFile`, `planemoCommand` (executable and literal
prefix arguments), `timeoutMs`, `galaxyRoot`, `galaxyPythonVersion`, `condaPrefix`,
and `signal`. It returns the same report as the CLI; validation failures return a
blocked report, while invalid inputs or staging I/O failures throw.

## Publication is still a later step

The preparation record's `validation.status` remains `not_run`, even after staging.
The separate staging report carries executed checks without rewriting the hashed
preparation output or its provenance. `prepare` does not certify licensing,
test coverage, upstream authenticity, or wrapper behavior, and `.shed.yml`'s
`type: unrestricted` is repository metadata, not a software-license judgment.
Preserve any coverage gaps in the conversion provenance and review them explicitly.

Before creating a PR, use `stage` to run the local gates above. Flattening `/` to
`_` can give two different module paths the same ID, so collision detection cannot
be settled from one input directory. The later GitHub adapter must create a scoped branch/PR,
disclose AI generation, and prove destination CI discovers this nested repository.
Packaging never enables deployment or needs publishing credentials.
