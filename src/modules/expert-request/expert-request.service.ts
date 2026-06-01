import type { ExpertRequestRepository } from "./expert-request.repository";

export class ExpertRequestService {
  constructor(private readonly repo: ExpertRequestRepository) {}

  async submit(
    userId: string,
    name: string,
    phone: string | undefined,
    message?: string,
  ) {
    const request = await this.repo.create({
      name,
      phone,
      message: message ?? "Requesting to talk to an expert.",
      userId,
    });
    return {
      id: request.id,
      message:
        "Your request has been received. Our expert will contact you shortly.",
    };
  }

  async list(filters: {
    status?: "unread" | "read" | "resolved";
    from?: Date;
    to?: Date;
    page: number;
    limit: number;
  }) {
    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await this.repo.list({
      status: filters.status,
      from: filters.from,
      to: filters.to,
      skip,
      take: filters.limit,
    });
    return {
      items,
      total,
      page: filters.page,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  async updateStatus(id: string, status: "unread" | "read" | "resolved") {
    return this.repo.updateStatus(id, status);
  }

  async delete(id: string) {
    await this.repo.delete(id);
    return { id };
  }

  async getSummary() {
    const counts = await this.repo.countByStatus();
    const summary: Record<string, number> = { unread: 0, read: 0, resolved: 0 };
    for (const c of counts) summary[c.status] = c._count._all;
    return summary;
  }

  async getUnreadCount() {
    const count = await this.repo.countUnread();
    return { unread: count };
  }

  async getStatusByUser(userId: string) {
    const request = await this.repo.findByUser(userId);
    return { requested: !!request, status: request?.status ?? null };
  }
}
