import { z } from 'zod';

/**
 * Zod schema for Chapter validation
 */
export const ChapterSchema = z.object({
  timelineName: z.string().min(1, 'Timeline name is required'),
  arcName: z.string().min(1, 'Arc name is required'),
  episodeNumber: z.number().int().min(0, 'Episode number must be a non-negative integer'),
  partNumber: z.number().int().min(1, 'Part number must be a positive integer'),
  number: z.number().int().min(1, 'Number must be a positive integer'),

  // Metadata fields
  pov: z.string().min(1, 'POV character is required'),
  title: z.string().min(1, 'Title is required'),
  date: z.string().min(1, 'Date is required'),
  summary: z.string().min(1, 'Summary is required'),
  location: z.string().min(1, 'Location is required'),
  outfit: z.string().optional(),
  kink: z.string().optional(),

  // Text statistics
  words: z.number().int().min(0, 'Words must be non-negative'),
  characters: z.number().int().min(0, 'Characters must be non-negative'),
  charactersNoSpaces: z.number().int().min(0, 'Characters without spaces must be non-negative'),
  paragraphs: z.number().int().min(0, 'Paragraphs must be non-negative'),
  sentences: z.number().int().min(0, 'Sentences must be non-negative'),
  readingTimeMinutes: z.number().int().min(0, 'Reading time must be non-negative'),
});

export const validateChapter = (data: unknown) => ChapterSchema.parse(data);
