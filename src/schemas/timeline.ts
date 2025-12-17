import { z } from 'zod';

/**
 * Zod schema for Timeline validation
 */
export const TimelineSchema = z.object({
  name: z.string().min(1, 'Timeline name is required'),
  description: z.string().min(1, 'Description is required'),
});

export const validateTimeline = (data: unknown) => TimelineSchema.parse(data);
