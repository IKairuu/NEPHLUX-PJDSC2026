import { Injectable } from '@nestjs/common';
import {
  BudgetCurvePoint,
  ClinicSector,
  ModelVersion,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const FACT_SELECT = {
  assessedOn: true,
  residentCode: true,
  patient: { select: { barangayId: true } },
  riskResult: { select: { riskLevel: true } },
  decision: { select: { decision: true } },
  uacrResults: {
    orderBy: { recordedAt: 'desc' },
    take: 1,
    select: { valueMgG: true },
  },
} satisfies Prisma.AssessmentSelect;

// One assessment, reduced to what the city counts need (no initials, no ids)
export type AssessmentFact = Prisma.AssessmentGetPayload<{
  select: typeof FACT_SELECT;
}>;

export interface BarangayForStats {
  id: number;
  name: string;
  pop2020: number;
  centreLat: number | null;
  centreLon: number | null;
  boundary?: Prisma.JsonValue;
}

export interface ClinicPoint {
  id: string;
  name: string;
  sector: ClinicSector;
  lat: number;
  lon: number;
}

@Injectable()
export class CityInsightsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBarangays(withBoundary: boolean): Promise<BarangayForStats[]> {
    return this.prisma.barangay.findMany({
      select: {
        id: true,
        name: true,
        pop2020: true,
        centreLat: true,
        centreLon: true,
        boundary: withBoundary,
      },
      orderBy: { codeIndex: 'asc' },
    });
  }

  findFacts(
    since: Date,
    sector: ClinicSector | null,
  ): Promise<AssessmentFact[]> {
    return this.prisma.assessment.findMany({
      where: {
        assessedOn: { gte: since },
        ...(sector && { clinic: { sector } }),
      },
      select: FACT_SELECT,
    });
  }

  findClinicPoints(): Promise<ClinicPoint[]> {
    return this.prisma.clinic.findMany({
      select: { id: true, name: true, sector: true, lat: true, lon: true },
    });
  }

  findActiveModelVersion(step: number): Promise<ModelVersion | null> {
    return this.prisma.modelVersion.findFirst({
      where: { step, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findBudgetPoints(modelVersionId: string): Promise<BudgetCurvePoint[]> {
    return this.prisma.budgetCurvePoint.findMany({
      where: { modelVersionId },
      orderBy: { testsPer1000: 'asc' },
    });
  }
}
