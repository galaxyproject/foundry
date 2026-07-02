import fs from 'node:fs';
import path from 'node:path';

// Third-party content licenses live at the repo root in ../LICENSES, outside the
// Astro project. We render them in-app so notes can link to license terms without
// bouncing the reader out to GitHub. (Pattern cribbed from statistical-genomics-
// foundry's lib/licenses.ts; the repos share no code.)
const LICENSES_DIR = path.resolve('../LICENSES');

export type License = {
  /** Route key, e.g. `nf-schema` for `LICENSES/nf-schema.LICENSE`. */
  id: string;
  /** Filename as referenced in note frontmatter, e.g. `nf-schema.LICENSE`. */
  filename: string;
  /** Raw license text. */
  text: string;
};

/** `LICENSES/nf-schema.LICENSE` (or `nf-schema.LICENSE`) -> `nf-schema`. */
export function licenseIdFromFile(licenseFile: string): string {
  return path.basename(licenseFile).replace(/\.LICENSE$/, '');
}

export function getLicenses(): License[] {
  return fs
    .readdirSync(LICENSES_DIR)
    .filter(name => name.endsWith('.LICENSE'))
    .sort()
    .map(filename => ({
      id: licenseIdFromFile(filename),
      filename,
      text: fs.readFileSync(path.join(LICENSES_DIR, filename), 'utf-8'),
    }));
}

export function getLicense(id: string): License | undefined {
  return getLicenses().find(license => license.id === id);
}
