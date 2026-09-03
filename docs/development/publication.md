# Publication

The five public packages in this repository publish to the `@galaxy-foundry`
npm scope from CI:

- `@galaxy-foundry/foundry`
- `@galaxy-foundry/note-schema`
- `@galaxy-foundry/planemo-cli-meta`
- `@galaxy-foundry/planemo-test-report-schema`
- `@galaxy-foundry/summarize-nextflow`

There is no npm token in this repository. Authentication uses npm OIDC trusted
publishing: npm trusts this repository, the release workflow, and its GitHub
environment, then issues a short-lived credential for that workflow run.

## Release flow

1. A pull request that changes a public package includes a `.changeset/*.md`
   describing the package and semver impact. The Packages workflow checks this.
2. After merge to `main`, `.github/workflows/release.yml` validates and packs
   every public package, then the Changesets action opens or updates the
   `chore(release): version packages` pull request.
3. Merging the version pull request runs the workflow again. Changesets publishes
   the bumped packages with npm provenance and creates GitHub releases.

The unprivileged `validate` job gates release on package typechecking, builds,
tests, `publint`, Are the Types Wrong, and clean-consumer tarball smoke tests.
It uploads only the generated `packages/*/dist` directories. The dependent
`release` job is the only job with repository-write and OIDC permissions, and
it never executes repository build or test scripts.

## First publication of a package

An npm trusted publisher can only be configured after the package exists. Each
new package therefore needs one manual stub publication from a maintainer
machine:

```sh
pnpm install
pnpm packages-build
npm login

cd packages/<pkg>
pnpm publish --no-git-checks --no-provenance --tag stub
```

`--no-provenance` overrides `publishConfig.provenance: true`, because a local
shell has no GitHub OIDC identity. `--no-git-checks` permits the intentionally
unreleased `0.0.0` package, and `--tag stub` distinguishes it from a real
release. npm may still make the first-ever version `latest`; the first
Changesets release restores `latest` to the real version.

Publish independent packages first, then their dependents:

1. `planemo-cli-meta`, `planemo-test-report-schema`, `note-schema`, and
   `summarize-nextflow` (any order)
2. `foundry` (depends on `summarize-nextflow`)

### Configure trusted publishing

For each package, open its npm package page, then **Settings → Trusted
Publishers**, and add:

| Field       | Value                   |
| ----------- | ----------------------- |
| Provider    | GitHub Actions          |
| Repository  | `galaxyproject/foundry` |
| Workflow    | `release.yml`           |
| Environment | `npm-publish`           |

The environment value must match `environment: npm-publish` in the workflow.
Changing either side without the other breaks publication.

Once all trusted publishers are registered, merge the pending Version Packages
pull request. It contains the real initial versions and will publish through
OIDC.

### A temporary 404 can be normal

Immediately after the first publish, npm's package endpoint can retain a cached
404 even when the version endpoint and `npm dist-tag ls <package>` show the
publication. Wait for the cache to expire before retrying the release.

## GitHub repository settings

- Create an `npm-publish` environment. It needs no secrets or protection rules
  unless releases should require manual approval.
- Under **Settings → Actions → General → Workflow permissions**, enable
  **Allow GitHub Actions to create and approve pull requests**. Workflow
  `pull-requests: write` permission does not replace this repository setting.

Do not add an `NPM_TOKEN` secret. Trusted publishing replaces the long-lived
bearer credential and ties every npm provenance attestation to the exact commit
and workflow that built the tarball.
