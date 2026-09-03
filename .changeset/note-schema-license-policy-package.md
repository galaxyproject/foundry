---
"@galaxy-foundry/gxwf-foundry-note-schema": minor
---

Consume the shared license table from `@galaxy-foundry/license-policy` instead of loading a
repo-local `license-policy.yml`.

**Breaking for importers.** The barrel no longer re-exports `loadLicensePolicy`,
`findLicensePolicyPath`, `licenseIds`, `isValidLicenseId`, `resolveLicenseRow`,
`LICENSE_POLICY_FILE`, `LICENSE_REF_RE`, `LicenseRow`, `CastMode`, or
`RedistributionPolicy`. Import them from `@galaxy-foundry/license-policy` directly. Only
the `LicensePolicy` type is still re-exported, since callers must name it to build the
`buildNoteSchema` options object.

`buildNoteSchema` is unchanged — it still takes a `licensePolicy`. Callers that used to
pass `loadLicensePolicy(repoRoot)` now pass `bundledPolicy()`.
