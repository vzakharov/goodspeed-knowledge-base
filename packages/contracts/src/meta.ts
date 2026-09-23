import { z } from 'zod';

const modelChoiceSchema = z.object({
  provider: z.string(),
  model: z.string(),
});

/** Which models the API is configured with — shown to the reader, never secrets. */
export const aiSettingsSchema = z.object({
  chat: modelChoiceSchema,
  embedding: modelChoiceSchema.extend({ dimensions: z.int().min(1) }),
});

export type AiSettings = z.infer<typeof aiSettingsSchema>;

/** The body of every error response the API sends. */
export const apiErrorSchema = z.object({
  statusCode: z.int(),
  error: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
