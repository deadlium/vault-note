/**
 * Vault Item Zod Validation Schemas
 * Comprehensive runtime validation for all vault item categories
 */

import { z } from 'zod';
import { loginItemSchema, loginPayloadSchema, customFieldSchema } from './loginSchema';
import { noteItemSchema, notePayloadSchema } from './noteSchema';

export * from './loginSchema';
export * from './noteSchema';

// --- Card Schema ---
export const cardPayloadSchema = z.object({
  cardholderName: z.string().trim().min(1, 'Cardholder name is required').max(100),
  cardNumber: z.string().regex(/^[\d\s-]{12,23}$/, 'Invalid card number format'),
  expirationMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Month must be 01-12'),
  expirationYear: z.string().regex(/^\d{4}$/, 'Year must be 4 digits'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
  pin: z.string().max(12).optional(),
  cardType: z.enum(['visa', 'mastercard', 'amex', 'discover', 'other']).optional(),
  notes: z.string().max(5000).optional(),
});

export const cardItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal('CARD'),
  title: z.string().trim().min(1).max(150),
  payload: cardPayloadSchema,
  tags: z.array(z.string().trim()).default([]),
  isFavorite: z.boolean().default(false),
  isProtected: z.boolean().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// --- TOTP Schema ---
export const totpPayloadSchema = z.object({
  issuer: z.string().trim().min(1, 'Issuer is required').max(100),
  accountName: z.string().trim().min(1, 'Account name is required').max(150),
  secret: z.string().regex(/^[A-Z2-7]+=*$/i, 'Invalid Base32 secret string'),
  algorithm: z.enum(['SHA1', 'SHA256', 'SHA512']).optional(),
  digits: z.union([z.literal(6), z.literal(8)]).optional(),
  period: z.number().int().positive().optional(),
});

export const totpItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal('TOTP'),
  title: z.string().trim().min(1).max(150),
  payload: totpPayloadSchema,
  tags: z.array(z.string().trim()).default([]),
  isFavorite: z.boolean().default(false),
  isProtected: z.boolean().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// --- API Key Schema ---
export const apiKeyPayloadSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  apiSecret: z.string().optional(),
  serviceName: z.string().max(100).optional(),
  endpointUrl: z.string().url().or(z.literal('')).optional(),
  expiresAt: z.number().int().positive().optional(),
  notes: z.string().max(5000).optional(),
});

export const apiKeyItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal('API_KEY'),
  title: z.string().trim().min(1).max(150),
  payload: apiKeyPayloadSchema,
  tags: z.array(z.string().trim()).default([]),
  isFavorite: z.boolean().default(false),
  isProtected: z.boolean().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// --- Identity Schema ---
export const identityPayloadSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(150),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().max(30).optional(),
  passportNumber: z.string().max(50).optional(),
  ssnOrNationalId: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
});

export const identityItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal('IDENTITY'),
  title: z.string().trim().min(1).max(150),
  payload: identityPayloadSchema,
  tags: z.array(z.string().trim()).default([]),
  isFavorite: z.boolean().default(false),
  isProtected: z.boolean().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// --- Recovery Codes Schema ---
export const recoveryCodesPayloadSchema = z.object({
  service: z.string().trim().min(1, 'Service name is required').max(100),
  codes: z.array(z.string().trim().min(1)).min(1, 'At least one recovery code required'),
  notes: z.string().max(5000).optional(),
});

export const recoveryCodesItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal('RECOVERY_CODES'),
  title: z.string().trim().min(1).max(150),
  payload: recoveryCodesPayloadSchema,
  tags: z.array(z.string().trim()).default([]),
  isFavorite: z.boolean().default(false),
  isProtected: z.boolean().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

/**
 * Discriminated union of all supported vault item schemas
 */
export const vaultItemSchema = z.discriminatedUnion('type', [
  loginItemSchema,
  noteItemSchema,
  cardItemSchema,
  totpItemSchema,
  apiKeyItemSchema,
  identityItemSchema,
  recoveryCodesItemSchema,
]);

/**
 * Validates and sanitizes a raw vault item input
 */
export function validateVaultItem(data: unknown) {
  return vaultItemSchema.parse(data);
}
