import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Tracker } from '@echoes-io/tracker';

export function validateGitHubRepo(): { exists: boolean; path: string } {
  const githubPath = resolve(process.cwd(), '../.github/.kiro/prompts');
  return {
    exists: existsSync(githubPath),
    path: githubPath,
  };
}

export async function validateArcExists(
  arc: string,
  tracker: Tracker,
  timeline: string,
): Promise<boolean> {
  const arcs = await tracker.getArcs(timeline);
  return arcs.some((a) => a.name === arc);
}

export async function validateArcNotExists(
  arc: string,
  tracker: Tracker,
  timeline: string,
): Promise<boolean> {
  return !(await validateArcExists(arc, tracker, timeline));
}

export async function getAvailableArcs(tracker: Tracker, timeline: string): Promise<string[]> {
  const arcs = await tracker.getArcs(timeline);
  return arcs.map((a) => a.name);
}
