import type { Tracker } from '@echoes-io/tracker';

import { getAvailableArcs, validateArcExists, validateArcNotExists } from './validation.js';

export async function substitutePlaceholders(
  promptName: string,
  template: string,
  args: Record<string, string>,
  timeline: string,
  tracker: Tracker,
): Promise<string> {
  const replacements: Record<string, string> = {
    TIMELINE: timeline,
    ...args,
  };

  // Prompt-specific validations
  if (['new-chapter', 'revise-chapter', 'expand-chapter'].includes(promptName)) {
    const { arc, chapter } = args;

    if (!arc) {
      throw new Error('Missing required argument: arc');
    }

    if (!chapter) {
      throw new Error('Missing required argument: chapter');
    }

    // Validate arc exists
    const arcExists = await validateArcExists(arc, tracker, timeline);
    if (!arcExists) {
      const available = await getAvailableArcs(tracker, timeline);
      throw new Error(
        `Arc "${arc}" not found in tracker.\nAvailable arcs: ${available.join(', ') || 'none'}`,
      );
    }

    // Validate chapter is a number
    if (!/^\d+$/.test(chapter)) {
      throw new Error(`Chapter must be a number, got: "${chapter}"`);
    }
  }

  if (promptName === 'new-arc') {
    const { name } = args;

    if (!name) {
      throw new Error('Missing required argument: name');
    }

    // Validate arc doesn't exist
    const arcNotExists = await validateArcNotExists(name, tracker, timeline);
    if (!arcNotExists) {
      throw new Error(`Arc "${name}" already exists in tracker.`);
    }
  }

  // Replace all placeholders
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{${key.toUpperCase()}}`;
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  return result;
}
