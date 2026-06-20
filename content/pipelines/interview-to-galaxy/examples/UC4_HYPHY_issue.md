# UC4 / HyPhy molecular-selection landscape across Dengue CDS genes — interview input

> Pulled-down GitHub issue used as the **effective result of the INTERVIEW → GALAXY interview**
> (the live interview mechanics are harness-owned and precede pipeline phase 1).
> Source: galaxy-brain issue #27 (captured verbatim from the issue body).
> No paired reference target: this case is **spec-only** — there is no vendored `.ga` golden to
> reproduce. Judge the run against the `expect:` block in `scenarios.md` (an agent checks the
> produced workflow against the issue's load-bearing intent at the end of the journey).

---

## Purpose

Develop a Galaxy Notebooks paper/demo vignette for a molecular-evolution / natural-selection analysis. We are writing a paper about "Galaxy Notebooks" — history-attached Galaxy-flavored markdown documents that embed REAL on-graph Galaxy tool outputs (tables, heatmaps, plots, images) into narrative, and from which a reusable workflow can be extracted by walking the history provenance graph backward. The discipline that matters: every figure/table the notebook displays should be a genuine on-graph tool output (so it's auditable AND seeds workflow extraction), analyses should run as collection map-overs where possible, and off-graph/pasted artifacts should be avoided. This issue belongs to `galaxy-brain` because the deliverable is a paper/demo notebook, NOT a proposal to add or change an IWC workflow.

## Objective

Show the conceptual jump from "run one selection test on one gene alignment" to "map a whole panel of HyPhy selection methods across a collection of codon alignments, then collapse the per-gene JSONs into a single cross-gene summary table you can read as a selection landscape."

- **MVP (Core):** Per-gene episodic diversifying vs. purifying selection across the two Dengue CDS genes that ship in the IWC test data, using MEME / FEL / BUSTED / PRIME run as a collection map-over, summarized into one combined table + per-site table.
- **Stretch (Compare):** Has selection pressure *shifted* between historical (1980–2004) and recent (2023) DENV1 lineages? Label the three recent 2023 isolates as foreground and run RELAX (intensification/relaxation) and Contrast-FEL (CFEL, site-level foreground-vs-background dN/dS contrast), summarized into a combined comparison table.

## Why this is a useful demo deviation

The IWC HyPhy workflows are batch pipelines that emit collections of per-gene JSON blobs — machine-readable but not human-narratable. A notebook is exactly the right surface to turn those JSONs into an interpreted selection landscape: a combined summary table across genes, a per-site significance view, and (for Compare) an explicit "did selection relax or intensify in recent lineages" verdict. It also showcases two notebook-friendly Galaxy patterns at once: **collection map-over** (one HyPhy tool fanned across a codon-alignment collection) and **provenance-driven workflow extraction** (the combined-summary tool sits at the bottom of the graph, so walking backward reconstructs the full preprocessing + per-method pipeline). DRHIP, the combined-summary tool, gives us genuine on-graph tables to embed instead of hand-parsing JSON off-graph.

## Existing analysis anchors

IWC repo: https://github.com/galaxyproject/iwc — workflows under `workflows/comparative_genomics/hyphy/`.

- `hyphy-core.ga` — Core selection panel as a per-gene map-over. Key tools (all `2.5.96+galaxy0`, genetic code `Universal`):
  - `toolshed.g2.bx.psu.edu/repos/iuc/hyphy_meme/hyphy_meme/2.5.96+galaxy0` (MEME — episodic diversifying selection per site)
  - `toolshed.g2.bx.psu.edu/repos/iuc/hyphy_fel/hyphy_fel/2.5.96+galaxy0` (FEL — pervasive site-level selection)
  - `toolshed.g2.bx.psu.edu/repos/iuc/hyphy_busted/hyphy_busted/2.5.96+galaxy0` (BUSTED — gene-wide episodic selection)
  - `toolshed.g2.bx.psu.edu/repos/iuc/hyphy_prime/hyphy_prime/2.5.96+galaxy0` (PRIME — property-informed selection)
  - Exposed Core workflow outputs are the JSON collections `meme_output`, `fel_output`, `busted_output`, `prime_output`. Note: each HyPhy tool also produces an `*_md_report` markdown output, but those are NOT wired as workflow outputs in `hyphy-core.ga` — TASK to verify whether to surface them or rely on DRHIP.
- `hyphy-preprocessing.ga` — codon-aware preprocessing chain feeding Core: `remove_terminal_stop_codons/1.0.0+galaxy0` → `collapse_dataset/5.1.0` → `ucsc_fasplit/fasplit/482` → `cawlign/0.1.15+galaxy0` (codon-aware alignment against the reference CDS) → `hyphy_cln/hyphy_cln/2.5.96+galaxy0` (CLN cleanup) → `iqtree/2.4.0+galaxy1` (per-gene ML tree). Outputs: codon-aware alignment collection (`output_file`) + gene-tree collection (`treefile`).
- `hyphy-compare.ga` — foreground-vs-background contrast. Tools: `hyphy_annotate/2.5.96+galaxy0` (label foreground + reference branches on the trees), `hyphy_relax/hyphy_relax/2.5.96+galaxy0` (RELAX), `hyphy_cfel/hyphy_cfel/2.5.96+galaxy0` (Contrast-FEL). Takes the codon-alignment collection, the tree collection, and a foreground sequence list; exposes `labeled_tree`, `relax_output`, `cfel_output`.
- `capheine-core-and-compare.ga` — the orchestrator (inspired by veg/capheine). It runs Preprocessing → Core, and optionally Compare (foreground via regex or explicit list). Crucially it ends in a **DRHIP** step `toolshed.g2.bx.psu.edu/repos/iuc/drhip/drhip/0.1.4+galaxy0` that collapses the per-gene JSONs into combined tables exposed as workflow outputs: `combined_summary`, `combined_sites`, `combined_comparison_summary`, `combined_comparison_site`. These are the on-graph tables the notebook should embed.

## Public data candidates

All anchor test data ships **in-repo** under `workflows/comparative_genomics/hyphy/test-data/` — no Zenodo/NCBI fetch is required to reproduce the MVP. What's actually present:

- `denv1_ref_cds.fasta` — the reference CDS. **Only two genes**: `NC_001477.1|capsid_protein_C|95-394_DENV1` and `NC_001477.1|membrane_glycoprotein precursor_prM|437-934`. So the Core "landscape" spans two genes, not the full DENV1 polyprotein. (TASK: decide whether to enrich the reference with more DENV1 CDS regions from NCBI for a richer paper figure, or keep it honest at two genes for the reproducible MVP.)
- `unaligned_seqs/` — **39 DENV1 isolate FASTAs**, named `ACCESSION|YEAR`, spanning 1980–2023. Historical accessions include `AY732474.1|1980`, `AY732483.1|1981`, `AY732481.1|1982`, `AF298807.1|1998`, `AB204803.1|2004`, etc. Recent 2023 lineage accessions are the `PP563xxx`/`PP564823` series (e.g. `PP563826.1|2023-08-21` … `PP564823.1|2023-10-06`).
- `foreground_seqs_list.txt` — defines the Compare foreground as **three recent 2023 isolates**: `PP563838_1_2023_09_30`, `PP563839_1_2023_09_29`, `PP563841_1_2023_09_25` (underscore-normalized form of the accession|date names). This is the historical-vs-2023 contrast the test suite actually exercises.
- `codon_alignments/` — precomputed codon alignments `capsid_protein_C.fasta`, `membrane_glycoprotein.fasta` (these let Compare run without re-aligning).
- `iqtree_trees/` — precomputed per-gene trees `capsid_protein_C.nhx`, `membrane_glycoprotein.nhx`.

**Recommendation:** Anchor the *paper story* on **Compare** (historical 1980–2004 vs. 2023 RELAX/CFEL shift) because that's the novel, narratable question and the foreground list is curated for exactly this contrast — but ship **Core** as the simpler MVP first, since Core has no foreground dependency and its combined summary table is the cleanest "selection landscape" artifact. Present Compare as the headline figure, Core as the foundation. Caveat the small reference panel (two genes) and small foreground (three sequences) honestly in the narrative.

## Notebook workflow plan

1. Import the reference CDS (`denv1_ref_cds.fasta`) as a single dataset and the 39 unaligned isolates as a **list collection** (one element per isolate). For Compare, also import `foreground_seqs_list.txt`.
2. Run codon-aware **Preprocessing** end-to-end (remove terminal stop codons → collapse → faSplit → `cawlign` against the reference → CLN → IQ-TREE), yielding a **codon-alignment collection** and a **gene-tree collection**, both keyed by gene. Display the alignment collection as an on-graph artifact. (MVP shortcut: import the precomputed `codon_alignments/` + `iqtree_trees/` collections directly to skip alignment runtime.)
3. **Core, as a collection map-over:** run MEME, FEL, BUSTED, and PRIME (genetic code `Universal`) each mapped over the codon-alignment collection → four per-gene JSON collections on-graph.
4. Run **DRHIP** (`drhip/0.1.4+galaxy0`) over the JSON collections to produce `combined_summary` (per-gene gene-wide selection verdicts) and `combined_sites` (per-site significant codons across genes). Embed both tables directly.
5. **Compare branch (stretch):** `hyphy_annotate` to label the 2023 foreground + reference branches on the gene trees (→ `labeled_tree` collection), then RELAX and Contrast-FEL mapped over the (labeled-tree, alignment) pairs → `relax_output` + `cfel_output` JSON collections.
6. Run **DRHIP** comparison mode → `combined_comparison_summary` (RELAX K intensification/relaxation per gene) and `combined_comparison_site` (CFEL site-level foreground-vs-background dN/dS contrasts). Embed as the headline tables.
7. Narrative interpretation cells beside each table: which genes/sites are under episodic diversifying (MEME) vs. pervasive (FEL) vs. gene-wide (BUSTED) selection; and whether RELAX reports relaxation (K<1) or intensification (K>1) in the 2023 lineage, with CFEL sites flagged.

## Expected paper/demo artifacts

- Codon-aware alignment collection (FASTA, per gene) — on-graph, audit-visible.
- Per-gene ML phylogenies (Newick/NHX), shown rendered; for Compare, the **foreground-labeled tree** highlighting the 2023 isolates.
- `combined_summary` table: per-gene gene-wide selection verdicts (BUSTED p-value, ω classes, etc.).
- `combined_sites` table: per-site MEME/FEL significant codons across both genes — the "selection landscape" table, optionally rendered as a per-site significance heatmap/strip plot keyed on codon position.
- `combined_comparison_summary` table (Compare): RELAX K and test p-value per gene — the headline "selection intensified vs. relaxed in 2023" result.
- `combined_comparison_site` table (Compare): CFEL site-level foreground-vs-background dN/dS contrasts.
- Optional per-method HyPhy markdown reports (`*_md_report`) if surfaced.

## Scope and risks

- **HyPhy input requirements:** codon sequences must be in-frame with **no internal stop codons**; the IWC README explicitly warns that internal stops or ongoing recombination can cause failures or *misleading* estimates. The preprocessing chain (`remove_terminal_stop_codons` + CLN) handles *terminal* stops and ambiguity, but does not screen recombination — flag this in the narrative; consider a recombination caveat or screen.
- **Small panels:** the reference is only two genes and the foreground is only three 2023 sequences. RELAX/CFEL on three foreground branches is statistically thin — present results as illustrative of the *method/notebook pattern*, not as a strong epidemiological claim. (TASK: optionally widen the 2023 foreground set from the available `PP563xxx` isolates.)
- **Genetic code:** workflows pin `Universal`; correct for DENV CDS — keep it, state it.
- **Version pinning:** pin the exact tool versions seen in the `.ga` files (HyPhy `2.5.96+galaxy0`, `cawlign 0.1.15+galaxy0`, `iqtree 2.4.0+galaxy1`, `drhip 0.1.4+galaxy0`) so the embedded outputs are reproducible; HyPhy JSON schemas and DRHIP table columns can shift across versions.
- **Runtime:** BUSTED and the alignment/IQ-TREE steps are the slow parts; the MVP should favor importing the precomputed `codon_alignments/` + `iqtree_trees/` collections so the notebook runs in workshop time.
- Keep every displayed table/figure on-graph (DRHIP outputs, JSON collections) — no off-graph JSON parsing in pandas cells, since off-graph artifacts break provenance-driven workflow extraction.

## Tasks

- [ ] Decide final anchor: Core-only MVP vs. Compare-as-headline (recommendation: ship Core MVP, feature Compare). Confirm with co-authors.
- [ ] Verify DRHIP (`drhip/0.1.4+galaxy0`) column schemas for `combined_summary`, `combined_sites`, `combined_comparison_summary`, `combined_comparison_site` against a real run, and confirm they render cleanly in a notebook.
- [ ] Decide whether to keep the honest two-gene reference or enrich `denv1_ref_cds.fasta` with more DENV1 CDS regions from NCBI for a richer landscape figure.
- [ ] Decide whether to widen the 2023 foreground beyond the three-isolate `foreground_seqs_list.txt`.
- [ ] Confirm whether to surface the per-method `*_md_report` markdown outputs (not currently exposed in `hyphy-core.ga`) or rely solely on DRHIP tables.
- [ ] Build the MVP notebook importing precomputed `codon_alignments/` + `iqtree_trees/` to skip alignment runtime.
- [ ] Run Core as collection map-over (MEME/FEL/BUSTED/PRIME, `Universal`) and embed `combined_summary` + `combined_sites`.
- [ ] Add Compare branch: annotate foreground → RELAX + CFEL → `combined_comparison_*` tables; embed labeled tree.
- [ ] Write interpretation cells (diversifying vs. purifying per site; relaxation vs. intensification in 2023).
- [ ] Add a recombination/internal-stop caveat and a "small-panel, illustrative" disclaimer to the narrative.
- [ ] Validate that walking the history provenance graph backward from the DRHIP tables reconstructs the full pipeline (workflow-extraction check).
- [ ] Validate runtime on a standard Galaxy instance; pin all tool versions.
- [ ] Decide which tables/figures feed directly into the Galaxy Notebooks manuscript.
