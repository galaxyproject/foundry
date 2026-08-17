// Which slug reaches which note, asserted against the real corpus.
//
// `wiki-links.test.ts` covers the grammar — what `[[Foo|bar]]` parses to. This is the other
// half: given the corpus, what does `[[foo]]` FIND. The rule ships in
// `@galaxy-foundry/content-reader`; the vocabulary it is given is ours, and the two together
// are what every `[[...]]` in `content/` was written against.
//
// The corpus was addressed by BASENAME for as long as it existed, so `content/cli/gxwf/
// draft-validate.md` answered to `[[draft-validate]]` and nothing else. The reader's primary
// address is the collection-relative id — `gxwf-draft-validate` — and the basename rides along
// as an alias, which is what keeps 174 existing links resolving. Both halves are pinned here
// because dropping either is silent: the links that break are in prose, and the addresses that
// never appear are ones nothing has written yet.

import path from "node:path";

import { describe, expect, it } from "vitest";

import { slugify } from "@galaxy-foundry/wiki-links";

import { GALAXY_SLUG_ALIASES, readContent } from "../packages/build-cli/src/lib/slug-map.js";
import { REPO_ROOT } from "./site-sources";

const index = readContent(path.join(REPO_ROOT, "content"), GALAXY_SLUG_ALIASES);
const fileFor = (address: string): string | undefined => index.notesByAddress.get(address)?.file;

describe("the addresses this corpus answers to", () => {
  it("still reaches a nested note by its basename alone", () => {
    // The spelling every link in `content/` uses today. A note one directory down inside its
    // collection — a CLI command, a prompt, a source pattern — is the case that changes if the
    // alias is ever dropped, and each of the three is one directory down for a different reason.
    expect(fileFor("draft-validate")).toBe("content/cli/gxwf/draft-validate.md");
    expect(fileFor("custom-tool-critic")).toBe(
      "content/prompts/galaxy/custom-tool-critic/index.md",
    );
    expect(fileFor("mix-collect-to-report-aggregation")).toBe(
      "content/source-patterns/nextflow/mix-collect-to-report-aggregation.md",
    );
  });

  it("also reaches it by the qualified id, which is the address that cannot collide", () => {
    expect(fileFor("gxwf-draft-validate")).toBe("content/cli/gxwf/draft-validate.md");
    expect(fileFor("galaxy-custom-tool-critic")).toBe(
      "content/prompts/galaxy/custom-tool-critic/index.md",
    );
    expect(fileFor("nextflow-mix-collect-to-report-aggregation")).toBe(
      "content/source-patterns/nextflow/mix-collect-to-report-aggregation.md",
    );
  });

  it("reaches a cli command by the pair a Mold author writes", () => {
    // `[[gxwf validate]]`, not `[[gxwf-validate]]` — the instance vocabulary alias. It lands on
    // the same address the qualified id produces, which is why the two agree by construction
    // rather than by anyone keeping them in step.
    expect(fileFor("gxwf-validate")).toBe("content/cli/gxwf/validate.md");
  });

  it("never lets an alias take an address a note holds outright", () => {
    // The one real basename collision in the corpus: a Mold and a CLI note both called
    // `summarize-nextflow`. The Mold's id IS `summarize-nextflow`, so the address is its
    // primary and the CLI note's basename alias cannot land on it. This used to depend on
    // which collection was walked last.
    expect(fileFor("summarize-nextflow")).toBe("content/molds/summarize-nextflow/index.md");
    expect(fileFor("foundry-summarize-nextflow")).toBe("content/cli/foundry/summarize-nextflow.md");
  });

  it("gives every routed note an address that finds it back", () => {
    // The qualified id is the address no note can be denied: it is the primary, and primaries
    // are registered before any alias. A note reachable by nothing is a page the corpus can
    // publish and never link, which is invisible from either end.
    const unreachable = index.notes
      .filter((note) => index.notesByAddress.get(qualified(note.id))?.file !== note.file)
      .map((note) => note.file);
    expect(unreachable, "\nrouted notes no address resolves to").toEqual([]);
  });
});

/**
 * The reader's primary address for an id: the collection-relative path, flattened, slugified.
 *
 * `slugify` is not decoration. `planemo/planemo-cli_metadata` addresses as
 * `planemo-planemo-climetadata` and `cwl-v1.2-schemas` as `cwl-v1-2-schemas`; a flatten alone
 * finds neither, which is how the first draft of this file reported five healthy notes missing.
 */
const qualified = (id: string): string => slugify(id.replace(/\//g, "-"));
