import { z } from 'zod';

/**
 * Zod schema for Arc validation
 */
export const ArcSchema = z.object({
  timelineName: z.string().min(1, 'Timeline name is required'),
  name: z.string().min(1, 'Arc name is required'),
  number: z.number().int().min(1, 'Number must be a positive integer'),
  description: z.string().min(1, 'Description is required'),
});

export const validateArc = (data: unknown) => ArcSchema.parse(data);
