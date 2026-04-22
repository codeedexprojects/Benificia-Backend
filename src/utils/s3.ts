import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { Buffer } from "node:buffer";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env";
import { BadRequestError } from "./errors";

// ── Upload categories ─────────────────────────────────────────

export const UPLOAD_CATEGORY = {
  PROFILE_PHOTO: "profile_photo",
  KYC_DOCUMENT: "kyc_document",
} as const;

export type UploadCategory =
  (typeof UPLOAD_CATEGORY)[keyof typeof UPLOAD_CATEGORY];

// ── Allowed MIME types per category ──────────────────────────

const ALLOWED_MIME: Record<UploadCategory, readonly string[]> = {
  profile_photo: ["image/jpeg", "image/png", "image/webp"],
  kyc_document: ["image/jpeg", "image/png", "application/pdf"],
};

// Max sizes — enforce at infrastructure level via S3 bucket policy for hard limits.
export const MAX_SIZE_BYTES: Record<UploadCategory, number> = {
  profile_photo: 5 * 1024 * 1024, // 5 MB
  kyc_document: 10 * 1024 * 1024, // 10 MB
};

// ── Content-type → file extension ────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

// ── TTLs ──────────────────────────────────────────────────────

const UPLOAD_URL_TTL = 10 * 60; // 10 min — enough time for a browser upload
const DOWNLOAD_URL_TTL = 15 * 60; // 15 min — short-lived read access

// ── S3 key builders ───────────────────────────────────────────

export const s3Keys = {
  // Single key per user — uploading a new photo overwrites the previous one
  profilePhoto(userId: string, contentType: string): string {
    const ext = MIME_TO_EXT[contentType] ?? "bin";
    return `profiles/${userId}/photo.${ext}`;
  },

  // Unique key per upload — preserves document history
  kycDocument(userId: string, docType: string, contentType: string): string {
    const ext = MIME_TO_EXT[contentType] ?? "bin";
    return `kyc/${userId}/${docType}/${Date.now()}.${ext}`;
  },
};

// ── Validation ────────────────────────────────────────────────

export function validateUpload(
  contentType: string,
  category: UploadCategory,
): void {
  if (!ALLOWED_MIME[category].includes(contentType)) {
    throw new BadRequestError(
      `File type not allowed. Accepted for ${category}: ${ALLOWED_MIME[category].join(", ")}`,
    );
  }
}

// ── Core operations ───────────────────────────────────────────

export interface UploadUrlResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
  maxSizeBytes: number;
}

/**
 * Generate a presigned PUT URL for direct browser-to-S3 upload.
 * The client MUST send the exact Content-Type header used here — S3 will reject mismatches.
 */
export async function generateUploadUrl(
  s3: S3Client,
  key: string,
  contentType: string,
  category: UploadCategory,
): Promise<UploadUrlResult> {
  validateUpload(contentType, category);

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: UPLOAD_URL_TTL },
  );

  return {
    uploadUrl: url,
    key,
    expiresIn: UPLOAD_URL_TTL,
    maxSizeBytes: MAX_SIZE_BYTES[category],
  };
}

/**
 * Generate a presigned GET URL for temporary read access.
 * Never expose raw S3 URLs to clients — always use this function.
 */
export async function generateDownloadUrl(
  s3: S3Client,
  key: string,
  expiresIn = DOWNLOAD_URL_TTL,
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }),
    { expiresIn },
  );
}

/**
 * Permanently delete an object.
 * Call when a user replaces a file or their account is deleted.
 */
export async function deleteObject(s3: S3Client, key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }),
  );
}

/**
 * Upload a buffer directly to S3 (server-side).
 * Used for Aadhaar photo upload from base64 data returned by Deepvue.
 */
export async function uploadBuffer(
  s3: S3Client,
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}
