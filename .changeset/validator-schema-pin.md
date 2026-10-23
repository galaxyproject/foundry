---
"@galaxy-foundry/gxwf-foundry": minor
---

Every single-schema `foundry validate-*` subcommand accepts `--schema-sha256 <hex>`. When the hash of the schema it carries differs, it exits `4` without validating. Given the pin and no artifact, it checks only the pin. Cast bundles record the pin in `_verify.json` and in their Validation section, so a validator release that lags a bundle's schema fails loudly instead of inverting the gate (#643, #706).
