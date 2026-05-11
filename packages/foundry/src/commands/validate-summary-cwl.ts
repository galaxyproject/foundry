import { summaryCwlSchema } from "../schemas/summary-cwl/summary-cwl.schema.generated.js";
import { createValidator } from "../lib/validator.js";
import { runJsonValidator } from "../lib/run-json-validator.js";

export const summaryCwlValidator = createValidator(summaryCwlSchema as object);

export function runValidateSummaryCwl(path: string): never {
  runJsonValidator(path, summaryCwlValidator);
}
