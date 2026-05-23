import type { Request, Response } from "express";
import type { EnquiryService } from "./enquiry.service";
import {
  submitEnquirySchema,
  updateEnquiryStatusSchema,
  listEnquiriesSchema,
} from "./enquiry.schema";
import { sendSuccess } from "../../utils/response";

export class EnquiryController {
  constructor(private readonly service: EnquiryService) {}

  submit = async (req: Request, res: Response): Promise<void> => {
    const { name, phone, message } = submitEnquirySchema.parse(req.body);
    const result = await this.service.submit(name, message, phone);
    sendSuccess(res, result, 201);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { status, from, to, page, limit } = listEnquiriesSchema.parse(
      req.query,
    );
    const result = await this.service.list({ status, from, to, page, limit });
    sendSuccess(res, result);
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const { status } = updateEnquiryStatusSchema.parse(req.body);
    const result = await this.service.updateStatus(id, status);
    sendSuccess(res, result);
  };

  getSummary = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.service.getSummary();
    sendSuccess(res, result);
  };
}
