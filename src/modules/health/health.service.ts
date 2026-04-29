import type { HealthRepository } from "./health.repository";
import type {
  CreateHealthCentreInput,
  UpdateHealthCentreInput,
  ListHealthCentresQuery,
} from "./health.schema";
import { NotFoundError } from "../../utils/errors";

export class HealthService {
  constructor(private readonly healthRepository: HealthRepository) {}

  async list(query: ListHealthCentresQuery) {
    const [centres, total] = await this.healthRepository.list(query);
    return {
      centres,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getById(id: string) {
    const centre = await this.healthRepository.findById(id);
    if (!centre || (centre as { deletedAt?: Date | null }).deletedAt)
      throw new NotFoundError("Health centre not found");
    return centre;
  }

  // ── Admin ─────────────────────────────────────────────────

  async adminList(query: ListHealthCentresQuery) {
    const [centres, total] = await this.healthRepository.adminList(query);
    return {
      centres,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async adminGetById(id: string) {
    const centre = await this.healthRepository.findByIdAdmin(id);
    if (!centre) throw new NotFoundError("Health centre not found");
    return centre;
  }

  async create(adminId: string, data: CreateHealthCentreInput) {
    return this.healthRepository.create(adminId, data);
  }

  async update(id: string, data: UpdateHealthCentreInput) {
    const existing = await this.healthRepository.findByIdAdmin(id);
    if (!existing || existing.deletedAt)
      throw new NotFoundError("Health centre not found");
    return this.healthRepository.update(id, data);
  }

  async remove(id: string) {
    const existing = await this.healthRepository.findByIdAdmin(id);
    if (!existing || existing.deletedAt)
      throw new NotFoundError("Health centre not found");
    await this.healthRepository.softDelete(id);
    return { message: "Health centre deleted" };
  }
}
