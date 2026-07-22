import { describe, expect, it, vi } from 'vitest';

import type { GraphQLClient } from '../../lib/graphql/client.js';
import { mageCharactersList } from '../../lib/tools/mage-characters.js';

describe('mageCharactersList', () => {
  it('returns list of characters', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockResolvedValue({
        listMageCharacters: {
          items: [
            { placeholder: 'ALE', username: 'echoesale-461m', timeline: 'eros', arc: 'ale' },
            { placeholder: 'VALE', username: 'echoesvale-221f', timeline: 'eros', arc: 'vale' },
          ],
        },
      }),
    };

    const result = await mageCharactersList(client);
    expect(result.characters).toHaveLength(2);
    expect(result.characters[0].placeholder).toBe('ALE');
    expect(result.characters[0].username).toBe('echoesale-461m');
  });
});
