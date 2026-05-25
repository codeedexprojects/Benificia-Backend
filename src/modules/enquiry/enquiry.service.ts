import type { EnquiryRepository } from "./enquiry.repository";

export class EnquiryService {
  constructor(private readonly repo: EnquiryRepository) {}

  async submit(name: string, message: string, phone?: string) {
    const enquiry = await this.repo.create({ name, phone, message });
    return {
      id: enquiry.id,
      message: "Your message has been received. We'll be in touch soon.",
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
}
