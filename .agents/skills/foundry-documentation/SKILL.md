---
name: foundry-documentation
description: Draft or revise reader-facing Foundry content, including meta pages, Mold and Pipeline explanations, patterns, manuals, and READMEs. Use for documentation pages, not code comments or docstrings.
---

# Foundry documentation

Write for the page's reader and purpose. Inspect the relevant Foundry content, code, configuration, and tests before describing behavior. Preserve the distinction between current behavior, planned work, and interpretation.

## Tone by location

- In `content/meta/`, make a grounded case for the design. Explain the problem, the choice, and why the choice helps a reader or contributor. A persuasive tone can be direct and opinionated, but claims still need evidence and concrete consequences. Avoid hype and sales language.
- Elsewhere under `content/`, favor technical explanation that remains readable. Lead with the current contract, action, or result. Avoid archaeology when possible: omit the sequence of past designs and implementation detours unless that history changes a decision the reader must make now. Put background research in research notes or link to it when needed.

## Prose rules

- Use no semicolons in prose. Use a period, a closed em-dash, or a comma. Preserve punctuation inside quotations, citations, code, and data.
- Use closed em-dashes (`—`) for appositive naming and substantial asides, without surrounding spaces. Use them only when they clarify the sentence.
- Keep openings, overviews, and summaries accessible. Introduce specialized terms when their meaning matters to the explanation, and define unfamiliar terms by what they do.
- Keep a metaphor only when it explains something the literal sentence cannot. If the sentence already carries concrete evidence—named tools, sample sizes, measured runtimes, or results—keep the evidence and cut a metaphor that merely decorates it.
- Avoid `ships` and `ships today`, `substrate` as technology jargon, `uses rather than owns`, and `gate` for a human decision. Name the actual behavior, infrastructure, ownership arrangement, or approval step. Keep literal, quoted, and precise technical uses when necessary, including Foundry's defined `Harness` and phase terms.

Treat these words and phrases as banned in original prose, while preserving quotations, published titles, and technical terms with precise meanings. Check each match in context rather than rewriting mechanically.

- Transition padding: `crucially`, `arguably`, `remarkably`, `inherently`.
- Puffery: `pivotal`, `paramount`, `multifaceted`, `intricate`, `indispensable`, `seamless`, `revolutionary`, `game-changing`, `ground-breaking`, `groundbreaking`, `unprecedented`.
- Metaphorical clichés: `tapestry`, `testament`, `beacon`, `foster`, `harness`, `delve`, `watershed`, `linchpin`, `double-edged sword`.
- Decorative verbs and phrases: `underscore`, `shed light on`, `pave the way for`, `illuminate`.
- Boilerplate: `black box`, `gold-standard`, `copious`, `demystify`, `it is important to note`, `it is important to remember`, `it is worth noting`, `it is worth mentioning`.
- Formulaic openings and closings: `X is fundamental to`, `X plays a vital role in`, `Ultimately, X bridges`, and `paving the way for future advances`.

## Draft and revise

- Start with the point the reader needs. Give each paragraph a job: make a claim, show its evidence or mechanism, and explain its consequence. Carry the argument into the next paragraph instead of restarting with another punch line.
- Name the actor and action. Use precise verbs for what the tool, page, or person actually does. Cut empty hedges such as `we attempt to explore`, `it might suggest`, and `could potentially indicate`. Express real uncertainty through evidence, scope, or a specific limitation. Do not strengthen a claim beyond its support.
- Vary sentence length according to the work each sentence does. State a finding plainly, then give the mechanism or qualification it needs. Avoid repeated short openers and strings of clipped sentences.
- Replace importance claims and decorative flourishes with the result or mechanism. Use lists for genuine sets of actions or options, and prose for reasoning.
- Check names, defaults, paths, arguments, output formats, dates, numbers, and links against available sources. Mark unresolved facts instead of inventing them. Preserve important qualifications when revising.

## Documentation contracts

- Choose the page's main job: guide a task, explain a concept, or provide exact reference facts. A README can combine these when one reader journey connects them.
- Open on the subject, decision, or task outcome. Let the title and first paragraph establish context without a stock preface such as `Use this page when...` or `This page explains...`. Put the common path first.
- For a workflow, show prerequisites, inputs, the action or command, expected output, and the next step. Explain why a step matters when that is not obvious. Show how to recognize success and recover from likely errors.
- In Mold and Pipeline descriptions, focus the body on what the reader should do with the inputs, decisions, outputs, and failures. Let declared references and phases carry the inventory and sequence. Put extended mechanism or rationale in the relevant research note instead of repeating the declarations in prose.
- For reference material, state accepted values, required or optional status, defaults, validation rules, side effects, and errors. Use a table when it makes the contract easier to scan.
- Make examples minimal and runnable when practical. Run available checks, or say what remains unverified. Distinguish released behavior from plans.
- Give headings enough context to work when reached directly through search. Define domain terms by their effect on the reader's task or data. Link to deeper references instead of repeating large blocks.
- After a code change, check related pages and examples for contradictions.

Before delivery, follow the page as its intended reader. Check that they can tell when it applies, complete the task, recognize success, and recover from an expected failure. Verify paths, commands, links, and examples. Report any substantive claim changes or facts that still need confirmation.
