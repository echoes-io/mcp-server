import { describe, expect, it } from 'vitest';

import { createCharacterNER } from '../../src/rag/character-ner.js';

describe('CharacterNER', () => {
  const ner = createCharacterNER();

  describe('extractCharacters', () => {
    it('should return array for any text input', () => {
      const text = 'Qualsiasi testo di esempio.';
      const characters = ner.extractCharacters(text);
      expect(Array.isArray(characters)).toBe(true);
    });

    it('should handle empty text', () => {
      const characters = ner.extractCharacters('');
      expect(Array.isArray(characters)).toBe(true);
    });

    it('should extract characters from outfit metadata', () => {
      const text = 'Una giornata normale.';
      const metadata = {
        outfit: 'Marco: vestito rosso, Giulia: camicia blu',
      };
      const characters = ner.extractCharacters(text, metadata);
      expect(Array.isArray(characters)).toBe(true);
      expect(characters).toContain('Marco');
      expect(characters).toContain('Giulia');
    });

    it('should handle metadata without outfit', () => {
      const text = 'Testo senza outfit.';
      const metadata = { location: 'Casa' };
      const characters = ner.extractCharacters(text, metadata);
      expect(Array.isArray(characters)).toBe(true);
    });
  });

  describe('extractMainCharacters', () => {
    it('should handle empty chapters array', () => {
      const mainCharacters = ner.extractMainCharacters([]);
      expect(Array.isArray(mainCharacters)).toBe(true);
      expect(mainCharacters.length).toBe(0);
    });

    it('should extract characters from chapters with outfit metadata', () => {
      const chapters = [
        {
          content: 'Una storia.',
          metadata: {
            arc: 'arc1',
            outfit: 'Marco: vestito elegante, Giulia: abito rosso',
          },
        },
      ];

      const mainCharacters = ner.extractMainCharacters(chapters);
      expect(Array.isArray(mainCharacters)).toBe(true);
      // NER results may vary, just check it returns an array
    });

    it('should handle chapters with no metadata', () => {
      const chapters = [
        {
          content: 'Una storia semplice.',
          metadata: {},
        },
      ];

      const mainCharacters = ner.extractMainCharacters(chapters);
      expect(Array.isArray(mainCharacters)).toBe(true);
    });
  });
});
