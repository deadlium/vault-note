/**
 * Secure Note Zod Validation Schema
 */

import { z } from 'zod';

export const notePayloadSchema = z.object({
  content: z.string().max(100000, 'Note content must not exceed 100KB'),
});

export const noteItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal('SECURE_NOTE'),
  title: z.string().trim().min(1, 'Title is required').max(150),
  payload: notePayloadSchema,
  tags: z.array(z.string().trim()).default([]),
  isFavorite: z.boolean().default(false),
  isProtected: z.boolean().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type NoteItemInput = z.infer<typeof noteItemSchema>;
