import { describe, expect, it, vi } from 'vitest';

import type { GraphQLClient } from '../../lib/graphql/client.js';
import { mageCommit } from '../../lib/tools/mage-commit.js';

describe('mageCommit', () => {
  it('commits with custom message', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockResolvedValue({
        commitMageImages: {
          commits: [{ repo: 'echoes-io/timeline-eros', sha: 'abc123def', filesCount: 3 }],
        },
      }),
    };

    const result = await mageCommit({ message: '🎨 Add scenes' }, client);
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0].repo).toBe('echoes-io/timeline-eros');
    expect(result.commits[0].filesCount).toBe(3);

    expect(client.execute).toHaveBeenCalledWith(expect.any(String), { message: '🎨 Add scenes' });
  });

  it('commits with no message (auto-generated)', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockResolvedValue({
        commitMageImages: { commits: [] },
      }),
    };

    const result = await mageCommit({}, client);
    expect(result.commits).toHaveLength(0);

    expect(client.execute).toHaveBeenCalledWith(expect.any(String), { message: undefined });
  });
});
