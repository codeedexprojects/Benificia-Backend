import { z } from "zod";
import { UPLOAD_CATEGORY } from "../../utils/s3";

const categoryEnum = z.enum(
  [UPLOAD_CATEGORY.PROFILE_PHOTO, UPLOAD_CATEGORY.KYC_DOCUMENT],
  { error: "Invalid upload category" },
);

const contentTypeEnum = z.enum(
  ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  { error: "Allowed file types are JPEG, PNG, WebP, and PDF" },
);

export const requestUploadUrlSchema = z
  .object({
    category: categoryEnum,
    contentType: contentTypeEnum,
    docType: z
      .string()
      .min(1, "Document type cannot be empty")
      .max(50, "Document type is too long")
      .optional(),
  })
  .refine(
    (data) => data.category !== UPLOAD_CATEGORY.KYC_DOCUMENT || !!data.docType,
    {
      message: "Document type is required for KYC document uploads",
      path: ["docType"],
    },
  );

export const getDownloadUrlSchema = z.object({
  key: z
    .string()
    .min(1, "File key is required")
    .max(500, "File key is too long"),
});

export const deleteFileSchema = z.object({
  key: z
    .string()
    .min(1, "File key is required")
    .max(500, "File key is too long"),
});
