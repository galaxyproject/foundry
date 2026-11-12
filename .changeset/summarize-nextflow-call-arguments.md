---
"@galaxy-foundry/summarize-nextflow": patch
---

Keep a call argument that spans several lines (a multi-line `.map { }` closure or `? :` ternary) as one argument instead of one per line, split arguments only at top-level commas, read one-line calls with nested parentheses, and drop trailing `//` comments from arguments. This fixes workflow edges, subworkflow invocation bindings and reference rebuild detection.
