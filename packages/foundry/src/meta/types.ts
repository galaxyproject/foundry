// Browser-safe CLI metadata types for `@galaxy-foundry/foundry/meta`.
// Mirrors the shape used by `@galaxy-tool-util/cli/meta` so the Foundry
// site's `cli-registry` can index both programs uniformly.

export interface CliOptionSpec {
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

export interface CliPositionalArgSpec {
  raw: string;
  name: string;
  required: boolean;
  variadic: boolean;
  description?: string;
}

export interface CliCommandSpec {
  name: string;
  fullName: string;
  description: string;
  synopsis: string;
  args: CliPositionalArgSpec[];
  options: CliOptionSpec[];
  commands: CliCommandSpec[];
}

export interface CliProgramSpec {
  name: string;
  description: string;
  version: string;
  commands: CliCommandSpec[];
}
