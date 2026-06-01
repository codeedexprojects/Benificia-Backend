import type { PrismaClient } from "@prisma/client";

export class ExpertRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: {
    name: string;
    phone?: string;
    message: string;
    userId: string;
  }) {
    return this.prisma.expertRequest.create({
      data,
      select: { id: true, createdAt: true },
    });
  }

  list(filters: {
    status?: "unread" | "read" | "resolved";
    from?: Date;
    to?: Date;
    skip: number;
    take: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      };
    }
    return Promise.all([
      this.prisma.expertRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: filters.skip,
        take: filters.take,
        select: {
          id: true,
          name: true,
          phone: true,
          message: true,
          status: true,
          userId: true,
          createdAt: true,
        },
      }),
      this.prisma.expertRequest.count({ where }),
    ]);
  }

  updateStatus(id: string, status: "unread" | "read" | "resolved") {
    return this.prisma.expertRequest.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }

  delete(id: string) {
    return this.prisma.expertRequest.delete({ where: { id } });
  }

  countByStatus() {
    return this.prisma.expertRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
  }

  countUnread() {
    return this.prisma.expertRequest.count({ where: { status: "unread" } });
  }

  findByUser(userId: string) {
    return this.prisma.expertRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true },
    });
  }
}
