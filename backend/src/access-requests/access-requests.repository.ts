import { Injectable } from '@nestjs/common';
import {
  AccessRequestStatus,
  Prisma,
  StaffRole,
  ChoUnit,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const ACCESS_REQUEST_INCLUDE = {
  clinic: { select: { id: true, yakapRef: true, name: true } },
  barangay: { select: { id: true, name: true } },
} satisfies Prisma.AccessRequestInclude;

export type AccessRequestRow = Prisma.AccessRequestGetPayload<{
  include: typeof ACCESS_REQUEST_INCLUDE;
}>;

export interface NewAccessRequest {
  fullName: string;
  email: string;
  role: StaffRole;
  prcLicenseNo: string | null;
  clinicId: string | null;
  barangayId: number | null;
  choUnit: ChoUnit | null;
}

@Injectable()
export class AccessRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async staffEmailExists(email: string): Promise<boolean> {
    const user = await this.prisma.staffUser.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    return user !== null;
  }

  async pendingEmailExists(email: string): Promise<boolean> {
    const found = await this.prisma.accessRequest.findFirst({
      where: { email, status: 'PENDING' },
      select: { id: true },
    });
    return found !== null;
  }

  findClinicByRef(
    yakapRef: string,
  ): Promise<{ id: string; yakapRef: string; name: string } | null> {
    return this.prisma.clinic.findUnique({
      where: { yakapRef },
      select: { id: true, yakapRef: true, name: true },
    });
  }

  findBarangay(id: number): Promise<{ id: number; name: string } | null> {
    return this.prisma.barangay.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }

  create(data: NewAccessRequest): Promise<AccessRequestRow> {
    return this.prisma.$transaction(async (tx) => {
      const saved = await tx.accessRequest.create({
        data,
        include: ACCESS_REQUEST_INCLUDE,
      });
      await tx.auditLog.create({
        data: {
          action: 'REQUEST_ACCESS',
          entity: 'access_requests',
          entityId: saved.id,
          details: { role: saved.role },
        },
      });
      return saved;
    });
  }

  async findMany(
    status: AccessRequestStatus | undefined,
    skip: number,
    take: number,
  ): Promise<{ rows: AccessRequestRow[]; total: number }> {
    const where: Prisma.AccessRequestWhereInput = status ? { status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.accessRequest.findMany({
        where,
        include: ACCESS_REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.accessRequest.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<AccessRequestRow | null> {
    return this.prisma.accessRequest.findUnique({
      where: { id },
      include: ACCESS_REQUEST_INCLUDE,
    });
  }

  updateStatus(
    id: string,
    status: AccessRequestStatus,
    userId: string,
  ): Promise<AccessRequestRow> {
    return this.prisma.$transaction(async (tx) => {
      const saved = await tx.accessRequest.update({
        where: { id },
        data: {
          status,
          reviewedAt: status === 'PENDING' ? null : new Date(),
        },
        include: ACCESS_REQUEST_INCLUDE,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'REVIEW_ACCESS_REQUEST',
          entity: 'access_requests',
          entityId: id,
          details: { status },
        },
      });
      return saved;
    });
  }
}
