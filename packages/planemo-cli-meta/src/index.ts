export { planemoCliMeta } from "./cli-meta.generated.js";
export { planemoCliMetaProvenance } from "./cli-meta.provenance.generated.js";

export interface PlanemoCliCommand {
  name: string;
  module: string | null;
  hidden: boolean;
  internal: boolean;
}
