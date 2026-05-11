// Registry of CLI command metadata, keyed by `<tool>/<command>`.
// Mirrors `schema-registry.ts`: in-repo CLI command notes are framing stubs;
// synopsis, args, options, and defaults come from upstream package metadata.

import { readInstalledPackageVersion } from './package-version';

export interface CliCommandOption {
  flags: string;
  name: string;
  short?: string;
  description: string;
  takesArgument: boolean;
  argumentPlaceholder?: string;
  optionalArgument: boolean;
  negatable: boolean;
  defaultValue?: string | number | boolean;
}

export interface CliCommandArg {
  raw: string;
  name: string;
  required: boolean;
  variadic: boolean;
  description?: string;
}

export interface CliCommandView {
  name: string;
  fullName: string;
  description: string;
  synopsis: string;
  args: CliCommandArg[];
  options: CliCommandOption[];
}

export interface CliRegistryEntry {
  command: CliCommandView;
  /** npm package name the metadata was sourced from. */
  package: string;
  /** Resolved package version, if available. */
  version: string;
  /** URL to the upstream program definition (best-effort). */
  upstream?: string;
}

export interface CliProgramView {
  name: string;
  description: string;
  version?: string;
  commands: CliCommandView[];
}

interface CliMetaModule {
  gxwfCliMeta?: CliProgramView;
  galaxyToolCacheCliMeta?: CliProgramView;
}

export function indexProgram(
  program: CliProgramView,
  packageName: string,
  packageVersion: string,
  upstream?: string,
): Record<string, CliRegistryEntry> {
  const out: Record<string, CliRegistryEntry> = {};
  for (const command of program.commands) {
    out[`${program.name}/${command.name}`] = {
      command,
      package: packageName,
      version: packageVersion,
      upstream,
    };
  }
  return out;
}

export async function loadCliRegistry(): Promise<Record<string, CliRegistryEntry>> {
  const packageName = '@galaxy-tool-util/cli';
  const packageVersion = readInstalledPackageVersion(packageName);
  try {
    const spec = `${packageName}/meta`;
    const meta = (await import(/* @vite-ignore */ spec)) as CliMetaModule;
    return {
      ...(meta.gxwfCliMeta
        ? indexProgram(
            meta.gxwfCliMeta,
            packageName,
            packageVersion,
            'https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json',
          )
        : {}),
      ...(meta.galaxyToolCacheCliMeta
        ? indexProgram(
            meta.galaxyToolCacheCliMeta,
            packageName,
            packageVersion,
            'https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/galaxy-tool-cache.json',
          )
        : {}),
    };
  } catch {
    // Defensive: meta subpath ships from @galaxy-tool-util/cli >=1.2.0; fall back to raw markdown if import fails.
    return {};
  }
}

export const cliRegistry: Record<string, CliRegistryEntry> = await loadCliRegistry();
