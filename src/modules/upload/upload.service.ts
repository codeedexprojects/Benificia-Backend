import type { S3Client } from "@aws-sdk/client-s3";
import {
  generateUploadUrl,
  generateDownloadUrl,
  deleteObject,
  validateUpload,
  s3Keys,
  UPLOAD_CATEGORY,
  type UploadCategory,
  type UploadUrlResult,
} from "../../utils/s3";
import { BadRequestError, ForbiddenError } from "../../utils/errors";

// All user-owned key prefixes — used to enforce ownership on download
const USER_KEY_PREFIXES: Record<UploadCategory, (userId: string) => string> = {
  [UPLOAD_CATEGORY.PROFILE_PHOTO]: (id) => `profiles/${id}/`,
  [UPLOAD_CATEGORY.KYC_DOCUMENT]: (id) => `kyc/${id}/`,
};

export class UploadService {
  constructor(private readonly s3: S3Client) {}

  async requestUploadUrl(
    userId: string,
    category: UploadCategory,
    contentType: string,
    docType?: string,
  ): Promise<UploadUrlResult> {
    validateUpload(contentType, category);

    let key: string;

    switch (category) {
      case UPLOAD_CATEGORY.PROFILE_PHOTO:
        key = s3Keys.profilePhoto(userId, contentType);
        break;
      case UPLOAD_CATEGORY.KYC_DOCUMENT:
        if (!docType) throw new BadRequestError("docType is required");
        key = s3Keys.kycDocument(userId, docType, contentType);
        break;
    }

    return generateUploadUrl(this.s3, key, contentType, category);
  }

  async getDownloadUrl(userId: string, key: string): Promise<string> {
    this.assertOwnership(userId, key);
    return generateDownloadUrl(this.s3, key);
  }

  async deleteFile(userId: string, key: string): Promise<void> {
    this.assertOwnership(userId, key);
    await deleteObject(this.s3, key);
  }

  private assertOwnership(userId: string, key: string): void {
    const owned = Object.values(USER_KEY_PREFIXES).some((prefix) =>
      key.startsWith(prefix(userId)),
    );
    if (!owned) throw new ForbiddenError("Access denied");
  }
}
