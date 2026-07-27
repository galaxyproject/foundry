// Re-export of the shared tags loader. The frontmatter contract itself now lives
// in @galaxy-foundry/note-schema (buildNoteSchema); the former ajv `loadSchema`
// + meta_schema.yml were retired when the validator went native-zod.
export { loadTagRegistry, type TagRegistry } from "@galaxy-foundry/tag-registry";
