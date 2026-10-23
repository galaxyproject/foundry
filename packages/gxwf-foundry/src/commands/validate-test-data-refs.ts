import { testDataRefsSchema } from "../schemas/test-data-refs/test-data-refs.schema.generated.js";
import { createValidator } from "../lib/validator.js";
import { runJsonValidator } from "../lib/run-json-validator.js";

export const testDataRefsValidator = createValidator(testDataRefsSchema as object);

export function runValidateTestDataRefs(path: string): never {
  runJsonValidator(path, testDataRefsValidator);
}
