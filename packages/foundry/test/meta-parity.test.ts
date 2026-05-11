// Verifies the static `foundryCliMeta` exported from `./meta` matches
// the live commander program built by `buildProgram()`. Drift means the
// site's per-subcommand pages will misrepresent the CLI; fail loudly.

import { describe, expect, it } from "vitest";
import { Argument, Command, Option } from "commander";
import { buildProgram } from "../src/program.js";
import { foundryCliMeta } from "../src/meta/index.js";
import type {
  CliCommandSpec,
  CliOptionSpec,
  CliPositionalArgSpec,
  CliProgramSpec,
} from "../src/meta/types.js";

function extractArg(arg: Argument): CliPositionalArgSpec {
  const inner = arg.name();
  return {
    raw: inner,
    name: inner,
    required: arg.required,
    variadic: arg.variadic,
    description: arg.description || undefined,
  };
}

function extractOption(opt: Option): CliOptionSpec {
  const flags = opt.flags;
  const tokens = flags.split(/[ ,|]+/).filter(Boolean);
  const short = tokens.find((t) => /^-[^-]/.test(t));
  const placeholderMatch = flags.match(/[<[][^>\]]+[>\]]/);
  const placeholder = placeholderMatch ? placeholderMatch[0] : undefined;
  const spec: CliOptionSpec = {
    flags,
    name: opt.attributeName(),
    description: opt.description,
    takesArgument: placeholder !== undefined,
    optionalArgument: placeholder?.startsWith("[") ?? false,
    negatable: opt.long?.startsWith("--no-") ?? false,
  };
  if (short) spec.short = short;
  if (placeholder) spec.argumentPlaceholder = placeholder;
  if (opt.defaultValue !== undefined) {
    spec.defaultValue = opt.defaultValue as CliOptionSpec["defaultValue"];
  }
  return spec;
}

function extractCommand(cmd: Command, parentName: string): CliCommandSpec {
  const fullName = `${parentName} ${cmd.name()}`.trim();
  const args = cmd.registeredArguments.map(extractArg);
  const options = cmd.options.map(extractOption);
  const synopsisParts: string[] = [fullName];
  if (options.length > 0) synopsisParts.push("[options]");
  for (const a of args) {
    const inner = a.variadic ? `${a.name}...` : a.name;
    synopsisParts.push(a.required ? `<${inner}>` : `[${inner}]`);
  }
  return {
    name: cmd.name(),
    fullName,
    description: cmd.description(),
    synopsis: synopsisParts.join(" "),
    args,
    options,
    commands: [],
  };
}

function extractProgram(program: Command): CliProgramSpec {
  return {
    name: program.name(),
    description: program.description(),
    version: foundryCliMeta.version,
    commands: program.commands.map((c) => extractCommand(c, program.name())),
  };
}

describe("foundryCliMeta", () => {
  it("matches the live commander program", () => {
    const derived = extractProgram(buildProgram());
    expect(derived).toEqual(foundryCliMeta);
  });
});
