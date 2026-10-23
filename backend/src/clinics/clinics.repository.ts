import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CLINIC_INCLUDE = {
  barangay: { select: { id: true, name: true } },
} satisfies Prisma.ClinicInclude;

export type ClinicWithBarangay = Prisma.ClinicGetPayload<{
  include: typeof CLINIC_INCLUDE;
}>;

@Injectable()
export class ClinicsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.ClinicWhereInput): Promise<ClinicWithBarangay[]> {
    return this.prisma.clinic.findMany({
      where,
      include: CLINIC_INCLUDE,
      // public clinics first, as residents see them
      orderBy: [{ sector: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string): Promise<ClinicWithBarangay | null> {
    return this.prisma.clinic.findUnique({
      where: { id },
      include: CLINIC_INCLUDE,
    });
  }
}
