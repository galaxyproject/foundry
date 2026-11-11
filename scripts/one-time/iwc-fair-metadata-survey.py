#!/usr/bin/env python3
"""IWC FAIR-metadata coverage survey.

Usage: python3 -I iwc_fair_metadata_survey.py <path-to-iwc-checkout> [--csv out.csv]
                                              [--include-subworkflows]

Counts, over every `*.ga` file under <iwc>/workflows/:
  - license, Person creators, ORCIDs, workflow tags
  - data and data-collection inputs: with an annotation, with a file format
and breaks missing input formats down by input type and by workflow category
(the first directory under workflows/).

Counting rules
  - One workflow = one `.ga` file. Subworkflows embedded inside a workflow are
    not counted as separate workflows. By default their inner inputs are not
    counted in the headline; they are reported on separate lines. With
    --include-subworkflows they are folded into the headline input counts.
  - Creator: entries with class "Person". Organizations are ignored.
  - ORCID: a Person identifier containing four groups of 4 characters (digits,
    last may be X), as a bare ID or inside an orcid.org URL.
  - Tags: non-empty `tags` list.
  - Inputs: steps of type data_input or data_collection_input at the top level.
    parameter_input steps are not counted.
  - Annotation: non-empty after stripping whitespace.
  - Format: non-empty `format` in the input step's tool_state.
Nothing is written to disk unless --csv is given.
"""
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ORCID = re.compile(r"\d{4}-\d{4}-\d{4}-\d{3}[\dX]")


def iter_inputs(steps, depth=0):
    """Yield (depth, step) for every data/collection input, recursing into subworkflows."""
    for s in (steps or {}).values():
        t = s.get("type")
        if t in ("data_input", "data_collection_input"):
            yield depth, s
        elif t == "subworkflow" and isinstance(s.get("subworkflow"), dict):
            yield from iter_inputs(s["subworkflow"].get("steps"), depth + 1)


def main(argv):
    if not argv:
        sys.exit(__doc__)
    root = Path(argv[0])
    incl = "--include-subworkflows" in argv
    inner_n = inner_fmt = 0
    csv_path = argv[argv.index("--csv") + 1] if "--csv" in argv else None
    wf_root = root / "workflows"

    rows = []
    by_cat = defaultdict(lambda: {"workflows": 0, "inputs": 0, "with_format": 0})
    n_sub_steps = 0
    unreadable = []
    for p in sorted(wf_root.glob("**/*.ga")):
        try:
            wf = json.loads(p.read_text())
        except Exception as e:  # report, do not hide
            unreadable.append((str(p), str(e)))
            continue
        cat = p.relative_to(wf_root).parts[0]
        creators = wf.get("creator") or []
        if isinstance(creators, dict):
            creators = [creators]
        persons = [c for c in creators if isinstance(c, dict) and c.get("class") == "Person"]
        orcids = [c for c in persons if ORCID.search(str(c.get("identifier") or ""))]
        row = {
            "file": str(p.relative_to(root)), "category": cat,
            "license": bool(wf.get("license")),
            "has_person": bool(persons),
            "all_persons_orcid": bool(persons) and len(orcids) == len(persons),
            "tags": bool(wf.get("tags")),
            "ds_inputs": 0, "ds_annotated": 0, "ds_format": 0,
            "col_inputs": 0, "col_annotated": 0, "col_format": 0,
        }
        for s in (wf.get("steps") or {}).values():
            if s.get("type") == "subworkflow":
                n_sub_steps += 1
        for depth, s in iter_inputs(wf.get("steps")):
            k = "ds" if s.get("type") == "data_input" else "col"
            try:
                ts = json.loads(s.get("tool_state") or "{}")
            except Exception:
                ts = {}
            if depth > 0:
                inner_n += 1
                inner_fmt += bool(ts.get("format"))
                if not incl:
                    continue
            row[k + "_inputs"] += 1
            if (s.get("annotation") or "").strip():
                row[k + "_annotated"] += 1
            if ts.get("format"):
                row[k + "_format"] += 1
        rows.append(row)
        c = by_cat[cat]
        c["workflows"] += 1
        c["inputs"] += row["ds_inputs"] + row["col_inputs"]
        c["with_format"] += row["ds_format"] + row["col_format"]

    n = len(rows)
    S = lambda key: sum(r[key] for r in rows)
    pct = lambda a, b: f"{100 * a / b:.0f}%" if b else "n/a"
    ds, col = S("ds_inputs"), S("col_inputs")
    n_in = ds + col
    fmt = S("ds_format") + S("col_format")
    ann = S("ds_annotated") + S("col_annotated")
    persons = S("has_person")

    print(f"workflows (.ga files under workflows/): {n}")
    if unreadable:
        print(f"unreadable files: {len(unreadable)}", unreadable[:3])
    print(f"embedded subworkflow steps (not counted separately): {n_sub_steps}")
    print()
    print("| Measure | Count | Share |")
    print("|---|---:|---:|")
    print(f"| License present | {S('license')} / {n} | {pct(S('license'), n)} |")
    print(f"| At least one Person creator | {persons} / {n} | {pct(persons, n)} |")
    print(f"| Every Person creator has an ORCID | {S('all_persons_orcid')} / {persons} | {pct(S('all_persons_orcid'), persons)} |")
    print(f"| Non-empty workflow tags | {S('tags')} / {n} | {pct(S('tags'), n)} |")
    print(f"| Data and collection inputs with an annotation | {ann} / {n_in} | {pct(ann, n_in)} |")
    print(f"| Inputs with a file format | {fmt} / {n_in} | {pct(fmt, n_in)} |")
    print(f"|   single-file inputs with a format | {S('ds_format')} / {ds} | {pct(S('ds_format'), ds)} |")
    print(f"|   collection inputs with a format | {S('col_format')} / {col} | {pct(S('col_format'), col)} |")
    print(f"| Inputs with no format | {n_in - fmt} / {n_in} | {pct(n_in - fmt, n_in)} |")
    print()
    print(f"inputs inside embedded subworkflows: {inner_n} ({inner_fmt} with a format); "
          + ("INCLUDED in the counts above" if incl else "NOT included in the counts above"))
    print()
    print("| Category (first folder under workflows/) | Workflows | Inputs | With format | Missing format |")
    print("|---|---:|---:|---:|---:|")
    for cat, c in sorted(by_cat.items(), key=lambda kv: -(kv[1]["inputs"] - kv[1]["with_format"])):
        print(f"| {cat} | {c['workflows']} | {c['inputs']} | {c['with_format']} | {c['inputs'] - c['with_format']} |")

    if csv_path:
        with open(csv_path, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=rows[0].keys())
            w.writeheader()
            w.writerows(rows)
        print(f"\nper-workflow CSV written to {csv_path}")


if __name__ == "__main__":
    main(sys.argv[1:])
