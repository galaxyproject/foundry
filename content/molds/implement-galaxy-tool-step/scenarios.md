# implement-galaxy-tool-step scenarios

Concrete cases for `implement-galaxy-tool-step`, exercised against the abstract properties in `eval.md`. Each case binds a fixture and states its expected values; the `eval.md` oracle is applied to whatever the case produces.

## Case: concrete step preserves failure evidence

- fixture: abstract step plus Galaxy tool summary where the wrapper defines exit-code, stdio regex, strict-shell, or dynamic output behavior.
- expect: implements the step without erasing failure evidence needed later, including tool id, input labels, output labels, collection shape, and any wrapper failure semantics relevant to runtime debugging.

## Case: runtime failure ownership hint

- fixture: concrete step implementation with a plausible mismatch between expected source behavior and Galaxy wrapper inputs, outputs, datatype, or collection support.
- expect: records whether a later failure should be investigated as tool/job failure, data-flow mistake, template wiring mistake, wrapper mismatch, or test/assertion issue.
