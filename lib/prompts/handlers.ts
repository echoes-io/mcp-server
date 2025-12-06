import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { Tracker } from '@echoes-io/tracker';

import { substitutePlaceholders } from './substitution.js';
import { validateGitHubRepo } from './validation.js';

const PROMPTS = [
  {
    name: 'new-chapter',
    description: 'Create a new chapter for a timeline arc',
    arguments: [
      { name: 'arc', description: 'Arc name (e.g., "work", "anima")', required: true },
      { name: 'chapter', description: 'Chapter number (e.g., "1", "12")', required: true },
    ],
  },
  {
    name: 'revise-chapter',
    description: 'Revise an existing chapter with specific improvements',
    arguments: [
      { name: 'arc', description: 'Arc name', required: true },
      { name: 'chapter', description: 'Chapter number', required: true },
    ],
  },
  {
    name: 'expand-chapter',
    description: 'Expand a chapter to reach target word count',
    arguments: [
      { name: 'arc', description: 'Arc name', required: true },
      { name: 'chapter', description: 'Chapter number', required: true },
      { name: 'target', description: 'Target word count (e.g., "4000")', required: true },
    ],
  },
  {
    name: 'new-character',
    description: 'Create a new character sheet',
    arguments: [{ name: 'name', description: 'Character name', required: true }],
  },
  {
    name: 'new-episode',
    description: 'Create a new episode outline',
    arguments: [
      { name: 'arc', description: 'Arc name', required: true },
      { name: 'episode', description: 'Episode number', required: true },
    ],
  },
  {
    name: 'new-arc',
    description: 'Create a new story arc',
    arguments: [{ name: 'name', description: 'Arc name (lowercase, no spaces)', required: true }],
  },
];

export function listPrompts() {
  return { prompts: PROMPTS };
}

export async function getPrompt(
  name: string,
  args: Record<string, string>,
  timeline: string,
  tracker: Tracker,
) {
  try {
    // Validate .github repo exists
    const { exists: githubExists, path: githubPath } = validateGitHubRepo();
    if (!githubExists) {
      throw new Error(
        '.github repository not found.\n' +
          'Clone it as sibling: git clone https://github.com/echoes-io/.github ../.github',
      );
    }

    // Read base template (required)
    const basePath = join(githubPath, `${name}.md`);
    if (!existsSync(basePath)) {
      throw new Error(
        `Prompt template not found: ${name}.md\n` +
          `Expected location: ../.github/.kiro/prompts/${name}.md`,
      );
    }
    const basePrompt = await readFile(basePath, 'utf-8');

    // Check for timeline override (optional)
    const timelinePromptsPath = resolve(process.cwd(), '.kiro/prompts');
    const overridePath = join(timelinePromptsPath, `${name}.md`);
    let overridePrompt = '';
    if (existsSync(overridePath)) {
      overridePrompt = await readFile(overridePath, 'utf-8');
    }

    // Concatenate (base first, then override)
    const combinedPrompt = overridePrompt
      ? `${basePrompt}\n\n---\n\n${overridePrompt}`
      : basePrompt;

    // Substitute placeholders
    const finalPrompt = await substitutePlaceholders(name, combinedPrompt, args, timeline, tracker);

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: finalPrompt,
          },
        },
      ],
    };
  } catch (error) {
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `❌ Error loading prompt "${name}":\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        },
      ],
    };
  }
}
