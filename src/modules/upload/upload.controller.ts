import type { Request, Response } from "express";
import type { UploadService } from "./upload.service";
import {
  requestUploadUrlSchema,
  getDownloadUrlSchema,
  deleteFileSchema,
} from "./upload.schema";
import { sendSuccess } from "../../utils/response";
import type { UploadCategory } from "../../utils/s3";

export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /api/v1/upload/url
   * Body: { category, contentType, docType? }
   * Returns a presigned PUT URL + the S3 key to confirm after upload
   */
  requestUploadUrl = async (req: Request, res: Response): Promise<void> => {
    const body = requestUploadUrlSchema.parse(req.body);

    const result = await this.uploadService.requestUploadUrl(
      req.user!.id,
      body.category as UploadCategory,
      body.contentType,
      body.docType,
    );

    sendSuccess(res, result);
  };

  /**
   * GET /api/v1/upload/url?key=...
   * Returns a short-lived presigned GET URL for the given S3 key
   */
  getDownloadUrl = async (req: Request, res: Response): Promise<void> => {
    const query = getDownloadUrlSchema.parse(req.query);
    const url = await this.uploadService.getDownloadUrl(
      req.user!.id,
      query.key,
    );
    sendSuccess(res, { url });
  };

  /**
   * DELETE /api/v1/upload/url?key=...
   * Permanently removes the file from S3. Caller must clear the key from DB separately.
   */
  deleteFile = async (req: Request, res: Response): Promise<void> => {
    const query = deleteFileSchema.parse(req.query);
    await this.uploadService.deleteFile(req.user!.id, query.key);
    sendSuccess(res, { message: "File deleted" });
  };
}
