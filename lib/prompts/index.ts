import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import z from 'zod';

export interface PromptConfig {
  name: string;
  description: string;
  args: z.ZodRawShape;
}

export const PROMPTS: PromptConfig[] = [
  {
    name: 'new-chapter',
    description: 'Create a new chapter for a timeline arc',
    args: {
      arc: z.string().describe("Arc name (e.g., 'work', 'anima')"),
      chapter: z.string().describe("Chapter number (e.g., '1', '12')"),
    },
  },
  {
    name: 'revise-chapter',
    description: 'Revise an existing chapter with specific improvements',
    args: {
      arc: z.string().describe('Arc name'),
      chapter: z.string().describe('Chapter number'),
    },
  },
  {
    name: 'expand-chapter',
    description: 'Expand a chapter to reach target word count',
    args: {
      arc: z.string().describe('Arc name'),
      chapter: z.string().describe('Chapter number'),
      target: z.string().describe("Target word count (e.g., '4000')"),
    },
  },
  {
    name: 'new-character',
    description: 'Create a new character sheet',
    args: {
      name: z.string().describe('Character name'),
    },
  },
  {
    name: 'new-episode',
    description: 'Create a new episode outline',
    args: {
      arc: z.string().describe('Arc name'),
      episode: z.string().describe('Episode number'),
    },
  },
  {
    name: 'new-arc',
    description: 'Create a new story arc',
    args: {
      name: z.string().describe('Arc name (lowercase, no spaces)'),
    },
  },
  {
    name: 'revise-arc',
    description: 'Review and fix an entire arc',
    args: {
      arc: z.string().describe('Arc name to revise'),
    },
  },
];

function getGithubPromptsPath(): string | null {
  const path = join(process.cwd(), '..', '.github', '.kiro', 'prompts');
  return existsSync(path) ? path : null;
}

function getLocalPromptsPath(): string | null {
  const path = join(process.cwd(), '.kiro', 'prompts');
  return existsSync(path) ? path : null;
}

function getAvailableArcs(contentPath: string): string[] {
  if (!existsSync(contentPath)) return [];
  return readdirSync(contentPath, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort();
}

function validateArgs(promptName: string, args: Record<string, string>, contentPath: string): void {
  const arcs = getAvailableArcs(contentPath);

  const requireArcExists = (arc: string) => {
    if (!arcs.includes(arc)) {
      throw new Error(`Arc "${arc}" not found. Available: ${arcs.join(', ') || 'none'}`);
    }
  };

  const requireNumber = (value: string, name: string) => {
    if (!/^\d+$/.test(value)) {
      throw new Error(`${name} must be a number, got: "${value}"`);
    }
  };

  switch (promptName) {
    case 'new-chapter':
    case 'revise-chapter':
    case 'expand-chapter':
      requireArcExists(args.arc);
      requireNumber(args.chapter, 'Chapter');
      if (promptName === 'expand-chapter') {
        requireNumber(args.target, 'Target');
      }
      break;
    case 'new-episode':
      requireArcExists(args.arc);
      requireNumber(args.episode, 'Episode');
      break;
    case 'new-arc':
      if (arcs.includes(args.name)) {
        throw new Error(`Arc "${args.name}" already exists.`);
      }
      break;
    case 'revise-arc':
      requireArcExists(args.arc);
      break;
  }
}

function substitutePlaceholders(
  template: string,
  args: Record<string, string>,
  timeline: string,
): string {
  const replacements: Record<string, string> = {
    TIMELINE: timeline,
    ...Object.fromEntries(Object.entries(args).map(([k, v]) => [k.toUpperCase(), v])),
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
  }
  return result;
}

export interface GetPromptOptions {
  timeline?: string;
  contentPath?: string;
}

export function getPrompt(
  name: string,
  args: Record<string, string>,
  options: GetPromptOptions = {},
): string {
  const timeline = options.timeline ?? 'timeline';
  const contentPath = options.contentPath ?? 'content';

  // Validate .github repo
  const githubPath = getGithubPromptsPath();
  if (!githubPath) {
    throw new Error(
      '.github repository not found.\n' +
        'Clone it as sibling: git clone https://github.com/echoes-io/.github ../.github',
    );
  }

  // Read base template
  const basePath = join(githubPath, `${name}.md`);
  if (!existsSync(basePath)) {
    throw new Error(`Prompt template not found: ${name}.md\nExpected: ${basePath}`);
  }
  const basePrompt = readFileSync(basePath, 'utf-8');

  // Read optional local override
  const localPath = getLocalPromptsPath();
  let overridePrompt = '';
  if (localPath) {
    const overridePath = join(localPath, `${name}.md`);
    if (existsSync(overridePath)) {
      overridePrompt = readFileSync(overridePath, 'utf-8');
    }
  }

  // Validate args
  validateArgs(name, args, contentPath);

  // Combine and substitute
  const combined = overridePrompt ? `${basePrompt}\n\n---\n\n${overridePrompt}` : basePrompt;
  return substitutePlaceholders(combined, args, timeline);
}
