/**
 * Login Item Zod Validation Schema
 */

import { z } from 'zod';

export const customFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(100),
  value: z.string().max(2000),
  isSecret: z.boolean().optional(),
});

export const loginPayloadSchema = z.object({
  username: z.string().max(256),
  password: z.string(),
  websiteUrl: z
    .string()
    .url()
    .or(z.literal(''))
    .optional(),
  totpSecret: z
    .string()
    .regex(/^[A-Z2-7]+=*$/i, 'Invalid Base32 secret')
    .or(z.literal(''))
    .optional(),
  notes: z.string().max(10000).optional(),
  customFields: z.array(customFieldSchema).optional(),
});

export const loginItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal('LOGIN'),
  title: z.string().trim().min(1, 'Title is required').max(150),
  payload: loginPayloadSchema,
  tags: z.array(z.string().trim()).default([]),
  isFavorite: z.boolean().default(false),
  isProtected: z.boolean().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type LoginItemInput = z.infer<typeof loginItemSchema>;
