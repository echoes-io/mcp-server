import { describe, expect, it, vi } from 'vitest';

import type { GraphQLClient } from '../../lib/graphql/client.js';
import { mageCharactersList } from '../../lib/tools/mage-characters.js';

describe('mageCharactersList', () => {
  it('returns list of characters', async () => {
    const client: GraphQLClient = {
      execute: vi.fn().mockResolvedValue({
        listMageCharacters: [
          {
            id: '1',
            name: 'Ale',
            username: 'echoesale-461m',
            imageUrl: 'https://...',
            timeline: 'eros',
            arc: 'ale',
            placeholder: 'ALE',
          },
          {
            id: '2',
            name: 'Vale',
            username: 'echoesvale-221f',
            imageUrl: 'https://...',
            timeline: 'eros',
            arc: 'vale',
            placeholder: 'VALE',
          },
        ],
      }),
    };

    const result = await mageCharactersList(client);
    expect(result.characters).toHaveLength(2);
    expect(result.characters[0].placeholder).toBe('ALE');
    expect(result.characters[0].username).toBe('echoesale-461m');
    expect(result.characters[0].name).toBe('Ale');
  });
});
