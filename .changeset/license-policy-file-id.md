---
"@galaxy-foundry/note-schema": patch
---

Take `@galaxy-foundry/license-policy` 0.4, which renames `licenseIdFromFilePath` to
`licenseFileIdFromPath` and `LicenseFile.licenseId` to `LicenseFile.id`.

Nothing this package imports was renamed — `bundledPolicy`, `isValidLicenseId` and
`resolveLicenseRow` are unchanged, and the only type re-exported from the barrel is still
`LicensePolicy`. The bump is here because a caret range on a `0.x` version pins the minor, so an
importer resolving both packages would otherwise be held at 0.3.
