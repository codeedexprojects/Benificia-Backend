import type { Request, Response } from "express";
import type { HealthService } from "./health.service";
import {
  createHealthCentreSchema,
  updateHealthCentreSchema,
  listHealthCentresSchema,
} from "./health.schema";
import { sendSuccess } from "../../utils/response";

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // ── Public ────────────────────────────────────────────────

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listHealthCentresSchema.parse(req.query);
    const result = await this.healthService.list(query);
    sendSuccess(res, result.centres, 200, result.meta);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const centre = await this.healthService.getById(req.params["id"] as string);
    sendSuccess(res, centre);
  };

  // ── Admin ─────────────────────────────────────────────────

  adminGetById = async (req: Request, res: Response): Promise<void> => {
    const centre = await this.healthService.adminGetById(
      req.params["id"] as string,
    );
    sendSuccess(res, centre);
  };

  adminList = async (req: Request, res: Response): Promise<void> => {
    const query = listHealthCentresSchema.parse(req.query);
    const result = await this.healthService.adminList(query);
    sendSuccess(res, result.centres, 200, result.meta);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createHealthCentreSchema.parse(req.body);
    const centre = await this.healthService.create(req.admin!.id, body);
    sendSuccess(res, centre, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const body = updateHealthCentreSchema.parse(req.body);
    const centre = await this.healthService.update(
      req.params["id"] as string,
      body,
    );
    sendSuccess(res, centre);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const result = await this.healthService.remove(req.params["id"] as string);
    sendSuccess(res, result);
  };
}
