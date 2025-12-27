import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateContent = vi.fn();
let constructorCalls = 0;

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = { generateContent: mockGenerateContent };
      constructor() {
        constructorCalls++;
      }
    },
  };
});

import {
  type ExtractionResult,
  extractEntities,
  resetClient,
} from '../../lib/indexer/extractor.js';

describe('extractor', () => {
  beforeEach(() => {
    resetClient();
    vi.clearAllMocks();
    constructorCalls = 0;
    process.env.GEMINI_API_KEY = 'test-api-key';
    delete process.env.ECHOES_GEMINI_MODEL;
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.ECHOES_GEMINI_MODEL;
  });

  describe('extractEntities', () => {
    it('extracts entities and relations from text', async () => {
      const mockResult: ExtractionResult = {
        entities: [
          {
            name: 'Alice',
            type: 'CHARACTER',
            description: 'The protagonist',
            aliases: ['Ali'],
          },
          {
            name: 'Rome',
            type: 'LOCATION',
            description: 'The city where the story takes place',
            aliases: [],
          },
        ],
        relations: [
          {
            source: 'Alice',
            target: 'Rome',
            type: 'LIVES_IN',
            description: 'Alice lives in Rome',
          },
        ],
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockResult),
      });

      const result = await extractEntities('Alice lives in Rome.');

      expect(constructorCalls).toBe(1);
      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: expect.stringContaining('Alice lives in Rome.'),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: expect.any(Object),
        },
      });
      expect(result.entities).toHaveLength(2);
      expect(result.relations).toHaveLength(1);
      expect(result.entities[0].name).toBe('Alice');
    });

    it('uses custom model from config', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ entities: [], relations: [] }),
      });

      await extractEntities('Test', { model: 'gemini-2.0-flash' });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gemini-2.0-flash' }),
      );
    });

    it('uses model from environment variable', async () => {
      process.env.ECHOES_GEMINI_MODEL = 'gemini-pro';
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ entities: [], relations: [] }),
      });

      await extractEntities('Test');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gemini-pro' }),
      );
    });

    it('config model takes precedence over env var', async () => {
      process.env.ECHOES_GEMINI_MODEL = 'gemini-pro';
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ entities: [], relations: [] }),
      });

      await extractEntities('Test', { model: 'custom-model' });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'custom-model' }),
      );
    });

    it('returns empty result when response has no text', async () => {
      mockGenerateContent.mockResolvedValue({ text: null });

      const result = await extractEntities('Test');

      expect(result).toEqual({ entities: [], relations: [] });
    });

    it('reuses client across calls', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ entities: [], relations: [] }),
      });

      await extractEntities('Test 1');
      await extractEntities('Test 2');

      expect(constructorCalls).toBe(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('throws when GEMINI_API_KEY is not set', async () => {
      delete process.env.GEMINI_API_KEY;

      await expect(extractEntities('Test')).rejects.toThrow(
        'GEMINI_API_KEY environment variable is required',
      );
    });

    it('validates response against schema', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          entities: [
            {
              name: 'Bob',
              type: 'CHARACTER',
              description: 'A friend',
              aliases: ['Bobby', 'Robert'],
            },
          ],
          relations: [],
        }),
      });

      const result = await extractEntities('Bob is here');

      expect(result.entities[0].aliases).toEqual(['Bobby', 'Robert']);
    });
  });

  describe('resetClient', () => {
    it('forces new client creation after reset', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ entities: [], relations: [] }),
      });

      await extractEntities('Test 1');
      expect(constructorCalls).toBe(1);

      resetClient();
      await extractEntities('Test 2');

      expect(constructorCalls).toBe(2);
    });
  });
});
