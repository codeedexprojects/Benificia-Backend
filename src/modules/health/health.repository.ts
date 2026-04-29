import type { PrismaClient } from "@prisma/client";
import type {
  CreateHealthCentreInput,
  UpdateHealthCentreInput,
  ListHealthCentresQuery,
} from "./health.schema";

const CENTRE_LIST_SELECT = {
  id: true,
  name: true,
  logoS3Key: true,
  phone: true,
  city: true,
  state: true,
  pincode: true,
  centreType: true,
  specialities: true,
  isFree: true,
  minFee: true,
  maxFee: true,
  rating: true,
  reviewCount: true,
  isVerified: true,
  isActive: true,
  createdAt: true,
} as const;

const CENTRE_DETAIL_SELECT = {
  ...CENTRE_LIST_SELECT,
  email: true,
  website: true,
  addressLine1: true,
  addressLine2: true,
  latitude: true,
  longitude: true,
  services: true,
  openingHours: true,
  notes: true,
} as const;

const CENTRE_ADMIN_DETAIL_SELECT = {
  ...CENTRE_DETAIL_SELECT,
  updatedAt: true,
  deletedAt: true,
  admin: { select: { id: true, name: true, email: true } },
} as const;

export class HealthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(query: ListHealthCentresQuery) {
    const {
      page,
      limit,
      search,
      city,
      state,
      pincode,
      centreType,
      isFree,
      isVerified,
      speciality,
    } = query;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      isActive: true,
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
      ...(city && { city: { equals: city, mode: "insensitive" as const } }),
      ...(state && { state: { equals: state, mode: "insensitive" as const } }),
      ...(pincode && { pincode }),
      ...(centreType && {
        centreType: { equals: centreType, mode: "insensitive" as const },
      }),
      ...(isFree !== undefined && { isFree }),
      ...(isVerified !== undefined && { isVerified }),
      ...(speciality && { specialities: { has: speciality } }),
    };

    return Promise.all([
      this.prisma.healthCentre.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isVerified: "desc" },
          { rating: "desc" },
          { createdAt: "desc" },
        ],
        select: CENTRE_LIST_SELECT,
      }),
      this.prisma.healthCentre.count({ where }),
    ]);
  }

  findById(id: string) {
    return this.prisma.healthCentre.findUnique({
      where: { id },
      select: CENTRE_DETAIL_SELECT,
    });
  }

  findByIdAdmin(id: string) {
    return this.prisma.healthCentre.findUnique({
      where: { id },
      select: CENTRE_ADMIN_DETAIL_SELECT,
    });
  }

  create(adminId: string, data: CreateHealthCentreInput) {
    return this.prisma.healthCentre.create({
      data: {
        ...data,
        services: data.services as never,
        openingHours: (data.openingHours ?? undefined) as never,
        addedByAdmin: adminId,
      },
      select: CENTRE_ADMIN_DETAIL_SELECT,
    });
  }

  update(id: string, data: UpdateHealthCentreInput) {
    return this.prisma.healthCentre.update({
      where: { id },
      data: {
        ...data,
        ...(data.services !== undefined && {
          services: data.services as never,
        }),
        ...(data.openingHours !== undefined && {
          openingHours: data.openingHours as never,
        }),
      },
      select: CENTRE_ADMIN_DETAIL_SELECT,
    });
  }

  softDelete(id: string) {
    return this.prisma.healthCentre.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true },
    });
  }

  // Admin listing — includes inactive and deleted
  adminList(query: ListHealthCentresQuery) {
    const {
      page,
      limit,
      search,
      city,
      state,
      pincode,
      centreType,
      isFree,
      isVerified,
    } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
      ...(city && { city: { equals: city, mode: "insensitive" as const } }),
      ...(state && { state: { equals: state, mode: "insensitive" as const } }),
      ...(pincode && { pincode }),
      ...(centreType && {
        centreType: { equals: centreType, mode: "insensitive" as const },
      }),
      ...(isFree !== undefined && { isFree }),
      ...(isVerified !== undefined && { isVerified }),
    };

    return Promise.all([
      this.prisma.healthCentre.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: CENTRE_LIST_SELECT,
      }),
      this.prisma.healthCentre.count({ where }),
    ]);
  }
}
