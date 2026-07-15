// Re-export shim: the canonical license-policy loader lives in the shared
// @galaxy-foundry/note-schema package. Kept so existing `../lib/license-policy.js`
// importers (validate, cast-mold, the scripts/lib alias) resolve without churn.
export {
  loadLicensePolicy,
  findLicensePolicyPath,
  licenseIds,
  isValidLicenseId,
  resolveLicenseRow,
  LICENSE_POLICY_FILE,
  LICENSE_REF_RE,
  type LicensePolicy,
  type LicenseRow,
  type CastMode,
  type RedistributionPolicy,
} from "@galaxy-foundry/note-schema";
