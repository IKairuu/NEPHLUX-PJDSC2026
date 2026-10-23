import { Injectable } from '@nestjs/common';
import { Clinic, ModelVersion } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ClinicWithBarangay = Clinic & { barangay: { name: string } };

@Injectable()
export class ResidentCheckRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveModelVersion(step: number): Promise<ModelVersion | null> {
    return this.prisma.modelVersion.findFirst({
      where: { step, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findClinicsWithBarangay(): Promise<ClinicWithBarangay[]> {
    return this.prisma.clinic.findMany({
      include: { barangay: { select: { name: true } } },
    });
  }
}
