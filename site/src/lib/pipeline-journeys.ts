export const PIPELINE_JOURNEYS = [
  'direct-build',
  'plan',
  'build-from-plan',
  'existing-workflow',
] as const;

export type PipelineJourney = (typeof PIPELINE_JOURNEYS)[number];

export const PIPELINE_JOURNEY_LABELS: Record<PipelineJourney, string> = {
  'direct-build': 'Direct Build',
  plan: 'Create a Workflow Brief',
  'build-from-plan': 'Build from a Workflow Brief',
  'existing-workflow': 'Existing Galaxy workflow',
};

const JOURNEY_SET = new Set<string>(PIPELINE_JOURNEYS);

export function pipelineJourney(tags: readonly string[]): PipelineJourney {
  const journeys = tags
    .filter((tag) => tag.startsWith('journey/'))
    .map((tag) => tag.slice('journey/'.length));

  if (journeys.length !== 1 || !JOURNEY_SET.has(journeys[0]!)) {
    throw new Error(
      `Expected exactly one valid journey/* tag; received ${journeys.length ? journeys.join(', ') : 'none'}`,
    );
  }

  return journeys[0] as PipelineJourney;
}
