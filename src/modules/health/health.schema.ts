import { z } from "zod";
import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from "../../config/constants";

const serviceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  price: z.number().nonnegative().optional(),
  isFree: z.boolean().default(false),
});

const openingHoursSchema = z
  .record(
    z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
    z.string().max(50),
  )
  .optional();

// ── Admin: create / update ────────────────────────────────

export const createHealthCentreSchema = z.object({
  name: z.string().min(1).max(255),
  logoS3Key: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.email().max(255).optional(),
  website: z.url().max(500).optional(),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().regex(/^\d{6}$/, "Must be a 6-digit pincode"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  centreType: z.string().min(1).max(50),
  specialities: z.array(z.string().max(100)).default([]),
  isFree: z.boolean().default(false),
  minFee: z.number().nonnegative().optional(),
  maxFee: z.number().nonnegative().optional(),
  services: z.array(serviceSchema).default([]),
  rating: z.number().min(0).max(5).optional(),
  isVerified: z.boolean().default(false),
  openingHours: openingHoursSchema,
  notes: z.string().max(1000).optional(),
});

export const updateHealthCentreSchema = createHealthCentreSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

// ── Listing / search ──────────────────────────────────────

export const listHealthCentresSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION_MAX_LIMIT)
    .default(PAGINATION_DEFAULT_LIMIT),
  search: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  centreType: z.string().max(50).optional(),
  isFree: z.coerce.boolean().optional(),
  isVerified: z.coerce.boolean().optional(),
  speciality: z.string().max(100).optional(),
});

export type CreateHealthCentreInput = z.infer<typeof createHealthCentreSchema>;
export type UpdateHealthCentreInput = z.infer<typeof updateHealthCentreSchema>;
export type ListHealthCentresQuery = z.infer<typeof listHealthCentresSchema>;
