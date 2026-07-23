import z from 'zod';

import type { GraphQLClient } from '../graphql/client.js';
import {
  CANCEL_MAGE_JOB,
  LIST_MAGE_JOBS,
  PAUSE_MAGE_QUEUE,
  QUEUE_MAGE_IMAGE,
  RESUME_MAGE_QUEUE,
} from '../graphql/queries.js';
import type {
  CancelMageJobResponse,
  ListMageJobsResponse,
  MageJob,
  PauseMageQueueResponse,
  QueueMageImageResponse,
  ResumeMageQueueResponse,
} from '../graphql/types.js';
import type { ToolConfig } from '../types.js';

// --- mage_queue_add ---

export const mageQueueAddConfig: ToolConfig = {
  name: 'mage_queue_add',
  description: 'Queue a single Mage image/video generation.',
  arguments: {
    prompt:
      'Prompt with [PLACEHOLDER] for characters. Can start with [XX] or [XXa] for number/variant.',
    imageType: 'Type of image: scene, chapter, or character.',
    arc: 'Character/arc name (e.g., ale, vale).',
    folder: 'Subfolder. Number ("1" → ep01), string ("promo"), or omitted.',
    number: 'Scene/chapter number. If omitted, extracted from [XX] prefix in prompt.',
    variant: 'Variant letter (a, b, c). If omitted, auto-incremented at save.',
    mediaType: 'Media type: image or video. Default: image.',
    sourceImage: 'Source image URL for img2img generation (optional).',
  },
};

export const mageQueueAddSchema = z.object({
  prompt: z.string().describe(mageQueueAddConfig.arguments.prompt),
  imageType: z.string().describe(mageQueueAddConfig.arguments.imageType),
  arc: z.string().describe(mageQueueAddConfig.arguments.arc),
  folder: z.string().optional().describe(mageQueueAddConfig.arguments.folder),
  number: z.number().optional().describe(mageQueueAddConfig.arguments.number),
  variant: z.string().optional().describe(mageQueueAddConfig.arguments.variant),
  mediaType: z.string().optional().describe(mageQueueAddConfig.arguments.mediaType),
  sourceImage: z.string().optional().describe(mageQueueAddConfig.arguments.sourceImage),
});

export type MageQueueAddInput = z.infer<typeof mageQueueAddSchema>;

/**
 * Extracts [XX] or [XXa] prefix from prompt.
 * Returns { number, variant, cleanPrompt }.
 */
export function parsePromptPrefix(prompt: string): {
  number?: number;
  variant?: string;
  cleanPrompt: string;
} {
  const match = prompt.match(/^\[(\d+)([a-z])?\]\s*/);
  if (!match) return { cleanPrompt: prompt };

  return {
    number: Number.parseInt(match[1], 10),
    variant: match[2] || undefined,
    cleanPrompt: prompt.slice(match[0].length),
  };
}

export async function mageQueueAdd(
  input: MageQueueAddInput,
  client: GraphQLClient,
): Promise<MageJob> {
  const parsed = mageQueueAddSchema.parse(input);
  const {
    number: prefixNumber,
    variant: prefixVariant,
    cleanPrompt,
  } = parsePromptPrefix(parsed.prompt);

  const result = await client.execute<QueueMageImageResponse>(QUEUE_MAGE_IMAGE, {
    input: {
      prompt: cleanPrompt,
      imageType: parsed.imageType,
      arc: parsed.arc,
      folder: parsed.folder,
      number: parsed.number ?? prefixNumber,
      variant: parsed.variant ?? prefixVariant,
      mediaType: parsed.mediaType,
      sourceImage: parsed.sourceImage,
    },
  });

  return result.queueMageImage;
}

// --- mage_queue_add_bulk ---

export const mageQueueAddBulkConfig: ToolConfig = {
  name: 'mage_queue_add_bulk',
  description: 'Queue multiple Mage image generations (one prompt per line).',
  arguments: {
    prompts: 'Prompts separated by newline. Each can have [XX] prefix.',
    imageType: 'Type of image for all: scene, chapter, or character.',
    arc: 'Arc name for all.',
    folder: 'Subfolder for all (optional).',
  },
};

export const mageQueueAddBulkSchema = z.object({
  prompts: z.string().describe(mageQueueAddBulkConfig.arguments.prompts),
  imageType: z.string().describe(mageQueueAddBulkConfig.arguments.imageType),
  arc: z.string().describe(mageQueueAddBulkConfig.arguments.arc),
  folder: z.string().optional().describe(mageQueueAddBulkConfig.arguments.folder),
});

export type MageQueueAddBulkInput = z.infer<typeof mageQueueAddBulkSchema>;

export interface MageQueueAddBulkOutput {
  queued: number;
  jobs: MageJob[];
}

export async function mageQueueAddBulk(
  input: MageQueueAddBulkInput,
  client: GraphQLClient,
): Promise<MageQueueAddBulkOutput> {
  const parsed = mageQueueAddBulkSchema.parse(input);
  const lines = parsed.prompts
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const jobs: MageJob[] = [];
  for (const line of lines) {
    const job = await mageQueueAdd(
      {
        prompt: line,
        imageType: parsed.imageType,
        arc: parsed.arc,
        folder: parsed.folder,
      },
      client,
    );
    jobs.push(job);
  }

  return { queued: jobs.length, jobs };
}

// --- mage_queue_list ---

export const mageQueueListConfig: ToolConfig = {
  name: 'mage_queue_list',
  description: 'List items currently in the Mage generation queue.',
  arguments: {},
};

export const mageQueueListSchema = z.object({});

export interface MageQueueListOutput {
  queued: MageJob[];
  processing: MageJob[];
}

export async function mageQueueList(client: GraphQLClient): Promise<MageQueueListOutput> {
  const [queued, processing] = await Promise.all([
    client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, { status: 'QUEUED' }),
    client.execute<ListMageJobsResponse>(LIST_MAGE_JOBS, { status: 'PROCESSING' }),
  ]);

  return {
    queued: queued.listMageJobs.items,
    processing: processing.listMageJobs.items,
  };
}

// --- mage_queue_pause ---

export const mageQueuePauseConfig: ToolConfig = {
  name: 'mage_queue_pause',
  description: 'Pause the Mage queue (current job continues to completion).',
  arguments: {},
};

export const mageQueuePauseSchema = z.object({});

export async function mageQueuePause(client: GraphQLClient): Promise<boolean> {
  const result = await client.execute<PauseMageQueueResponse>(PAUSE_MAGE_QUEUE);
  return result.pauseMageQueue;
}

// --- mage_queue_resume ---

export const mageQueueResumeConfig: ToolConfig = {
  name: 'mage_queue_resume',
  description: 'Resume the Mage queue processing.',
  arguments: {},
};

export const mageQueueResumeSchema = z.object({});

export async function mageQueueResume(client: GraphQLClient): Promise<boolean> {
  const result = await client.execute<ResumeMageQueueResponse>(RESUME_MAGE_QUEUE);
  return result.resumeMageQueue;
}

// --- mage_queue_cancel ---

export const mageQueueCancelConfig: ToolConfig = {
  name: 'mage_queue_cancel',
  description: 'Cancel a job from the Mage queue.',
  arguments: {
    id: 'ID of the job to cancel (or prefix).',
  },
};

export const mageQueueCancelSchema = z.object({
  id: z.string().describe(mageQueueCancelConfig.arguments.id),
});

export type MageQueueCancelInput = z.infer<typeof mageQueueCancelSchema>;

export async function mageQueueCancel(
  input: MageQueueCancelInput,
  client: GraphQLClient,
): Promise<MageJob> {
  const { id } = mageQueueCancelSchema.parse(input);
  const result = await client.execute<CancelMageJobResponse>(CANCEL_MAGE_JOB, { id });
  return result.cancelMageJob;
}
