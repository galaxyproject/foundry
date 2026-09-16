# @galaxy-foundry/nfcore-tool-lab

Deterministic preparation of an already converted nf-core Galaxy tool for the
experimental [tools-iwc-lab](https://github.com/galaxyproject/tools-iwc-lab)
repository. No model, checkout, network access, or GitHub credentials are needed.
This does not convert Nextflow, open a PR, or deploy to a Tool Shed.

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

## Publication is a later step

`validation.status` is always `not_run`. This command does not certify licensing,
test coverage, upstream authenticity, or wrapper behavior, and `.shed.yml`'s
`type: unrestricted` is repository metadata, not a software-license judgment.
Preserve any coverage gaps in the conversion provenance and review them explicitly.

Before creating a PR, the publishing harness must run final-package Planemo lint,
Tool Shed metadata checks, and real tests; verify licensing and conversion bundle
identity; and check repository-wide tool/Shed-name collisions. Flattening `/` to
`_` can give two different module paths the same ID, so collision detection cannot
be settled from one input directory. The harness must create a scoped branch/PR,
disclose AI generation, and prove destination CI discovers this nested repository.
Packaging never enables deployment or needs publishing credentials.
