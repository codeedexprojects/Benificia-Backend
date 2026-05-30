import { z } from "zod";

export const expertRequestSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(30).optional(),
  message: z.string().max(2000).optional(),
});

export const updateExpertRequestStatusSchema = z.object({
  status: z.enum(["unread", "read", "resolved"]),
});

export const listExpertRequestsSchema = z.object({
  status: z.enum(["unread", "read", "resolved"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
