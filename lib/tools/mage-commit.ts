import z from 'zod';

import type { GraphQLClient } from '../graphql/client.js';
import { COMMIT_MAGE_IMAGES } from '../graphql/queries.js';
import type { CommitMageImagesResponse } from '../graphql/types.js';
import type { ToolConfig } from '../types.js';

export const mageCommitConfig: ToolConfig = {
  name: 'mage_commit',
  description: 'Commit saved images from S3 to GitHub repos via Git Data API.',
  arguments: {
    message: 'Custom commit message. Default: auto-generated.',
  },
};

export const mageCommitSchema = z.object({
  message: z.string().optional().describe(mageCommitConfig.arguments.message),
});

export type MageCommitInput = z.infer<typeof mageCommitSchema>;

export interface MageCommitOutput {
  commits: Array<{ repo: string; sha: string; filesCount: number }>;
}

export async function mageCommit(
  input: MageCommitInput,
  client: GraphQLClient,
): Promise<MageCommitOutput> {
  const { message } = mageCommitSchema.parse(input);
  const result = await client.execute<CommitMageImagesResponse>(COMMIT_MAGE_IMAGES, { message });
  return { commits: result.commitMageImages.commits };
}
