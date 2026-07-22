import z from 'zod';

import type { GraphQLClient } from '../graphql/client.js';
import { LIST_MAGE_CHARACTERS } from '../graphql/queries.js';
import type { ListMageCharactersResponse, MageCharacter } from '../graphql/types.js';
import type { ToolConfig } from '../types.js';

export const mageCharactersListConfig: ToolConfig = {
  name: 'mage_characters_list',
  description: 'List configured Mage characters with their placeholders.',
  arguments: {},
};

export const mageCharactersListSchema = z.object({});

export interface MageCharactersListOutput {
  characters: MageCharacter[];
}

export async function mageCharactersList(client: GraphQLClient): Promise<MageCharactersListOutput> {
  const result = await client.execute<ListMageCharactersResponse>(LIST_MAGE_CHARACTERS);
  return { characters: result.listMageCharacters.items };
}
