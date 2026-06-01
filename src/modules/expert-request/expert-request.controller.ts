import type { Request, Response } from "express";
import type { ExpertRequestService } from "./expert-request.service";
import {
  expertRequestSchema,
  updateExpertRequestStatusSchema,
  listExpertRequestsSchema,
} from "./expert-request.schema";
import { sendSuccess } from "../../utils/response";

export class ExpertRequestController {
  constructor(private readonly service: ExpertRequestService) {}

  submit = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { name, phone, message } = expertRequestSchema.parse(req.body);
    const displayName = name ?? user.email ?? "User";
    const result = await this.service.submit(
      user.id,
      displayName,
      phone,
      message,
    );
    sendSuccess(res, result, 201);
  };

  getStatus = async (req: Request, res: Response): Promise<void> => {
    const user = (req as Request & { user: { id: string } }).user;
    const result = await this.service.getStatusByUser(user.id);
    sendSuccess(res, result);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { status, from, to, page, limit } = listExpertRequestsSchema.parse(
      req.query,
    );
    const result = await this.service.list({ status, from, to, page, limit });
    sendSuccess(res, result);
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const { status } = updateExpertRequestStatusSchema.parse(req.body);
    const result = await this.service.updateStatus(id, status);
    sendSuccess(res, result);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const result = await this.service.delete(id);
    sendSuccess(res, result);
  };

  getSummary = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.service.getSummary();
    sendSuccess(res, result);
  };

  getUnreadCount = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.service.getUnreadCount();
    sendSuccess(res, result);
  };
}
