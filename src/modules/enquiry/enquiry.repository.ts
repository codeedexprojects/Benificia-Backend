import type { PrismaClient } from "@prisma/client";

export class EnquiryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: { name: string; phone?: string; message: string }) {
    return this.prisma.enquiry.create({
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
      this.prisma.enquiry.findMany({
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
          createdAt: true,
        },
      }),
      this.prisma.enquiry.count({ where }),
    ]);
  }

  updateStatus(id: string, status: "unread" | "read" | "resolved") {
    return this.prisma.enquiry.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }

  countByStatus() {
    return this.prisma.enquiry.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
  }
}
