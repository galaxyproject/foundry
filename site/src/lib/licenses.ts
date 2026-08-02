import path from 'node:path';

import { loadLicenseFiles, type LicenseFile } from '@galaxy-foundry/license-policy';

// Third-party content licenses live at the repo root in ../LICENSES, outside the Astro project.
// We render them in-app so notes can link to license terms without bouncing the reader out to
// GitHub.
//
// The READER is not ours. It ships in @galaxy-foundry/license-policy, beside the table whose
// `license_file` obligation these copies satisfy — this file used to carry a comment saying the
// pattern was cribbed from statistical-genomics-foundry and that the repos shared no code, which
// is about as clear a case for installing a thing as there is. What stays here is the one fact
// the package declines to know: WHERE the directory is. It takes that as a parameter precisely
// because the callers are Astro pages whose cwd is a subdirectory.
const LICENSES_DIR = path.resolve('../LICENSES');

export type { LicenseFile };

export function getLicenses(): LicenseFile[] {
  return loadLicenseFiles(LICENSES_DIR);
}
