import { z } from "zod";

export const submitEnquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  phone: z.string().max(30).optional(),
  message: z.string().min(5, "Message must be at least 5 characters").max(5000),
});

export const updateEnquiryStatusSchema = z.object({
  status: z.enum(["unread", "read", "resolved"]),
});

export const listEnquiriesSchema = z.object({
  status: z.enum(["unread", "read", "resolved"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
