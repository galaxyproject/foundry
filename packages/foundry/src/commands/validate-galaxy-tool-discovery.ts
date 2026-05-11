import { galaxyToolDiscoverySchema } from "../schemas/galaxy-tool-discovery/galaxy-tool-discovery.schema.generated.js";
import { createValidator } from "../lib/validator.js";
import { runJsonValidator } from "../lib/run-json-validator.js";

export const galaxyToolDiscoveryValidator = createValidator(galaxyToolDiscoverySchema as object);

export function runValidateGalaxyToolDiscovery(path: string): never {
  runJsonValidator(path, galaxyToolDiscoveryValidator);
}
