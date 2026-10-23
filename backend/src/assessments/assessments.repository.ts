import { Injectable } from '@nestjs/common';
import { ModelVersion, Patient, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const ASSESSMENT_INCLUDE = {
  clinic: { select: { id: true, name: true, sector: true } },
  patient: { include: { barangay: { select: { id: true, name: true } } } },
  riskResult: {
    include: {
      reasons: { orderBy: { rank: 'asc' } },
      modelVersion: { select: { version: true } },
    },
  },
  decision: true,
  uacrResults: { orderBy: { recordedAt: 'desc' }, take: 1 },
} satisfies Prisma.AssessmentInclude;

export type AssessmentFull = Prisma.AssessmentGetPayload<{
  include: typeof ASSESSMENT_INCLUDE;
}>;

export interface RiskResultInput {
  modelVersionId: string;
  probability: number;
  riskLevel: Prisma.RiskResultCreateWithoutAssessmentInput['riskLevel'];
  egfr: number;
  suggestion: Prisma.RiskResultCreateWithoutAssessmentInput['suggestion'];
  reasons: { rank: number; featureKey: string; contribution: number }[];
}

@Injectable()
export class AssessmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveModelVersion(step: number): Promise<ModelVersion | null> {
    return this.prisma.modelVersion.findFirst({
      where: { step, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPatientById(id: string): Promise<Patient | null> {
    return this.prisma.patient.findUnique({ where: { id } });
  }

  // Saves the assessment, its risk result and reasons, and an audit entry in one transaction
  createWithRisk(
    data: Omit<Prisma.AssessmentUncheckedCreateInput, 'patientId'>,
    patient: { id: string } | Prisma.PatientUncheckedCreateInput,
    risk: RiskResultInput,
  ): Promise<AssessmentFull> {
    return this.prisma.$transaction(async (tx) => {
      const patientId =
        'id' in patient && patient.id
          ? patient.id
          : (
              await tx.patient.create({
                data: patient as Prisma.PatientUncheckedCreateInput,
              })
            ).id;
      const { reasons, ...result } = risk;
      const created = await tx.assessment.create({
        data: {
          ...data,
          patientId,
          riskResult: {
            create: { ...result, reasons: { create: reasons } },
          },
        },
        include: ASSESSMENT_INCLUDE,
      });
      await tx.auditLog.create({
        data: {
          userId: data.doctorId,
          action: 'SAVE_ASSESSMENT',
          entity: 'assessments',
          entityId: created.id,
          details: { riskLevel: risk.riskLevel },
        },
      });
      return created;
    });
  }

  async findMany(
    where: Prisma.AssessmentWhereInput,
    skip: number,
    take: number,
  ): Promise<[AssessmentFull[], number]> {
    return this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where,
        include: ASSESSMENT_INCLUDE,
        orderBy: [{ assessedOn: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.assessment.count({ where }),
    ]);
  }

  findById(id: string): Promise<AssessmentFull | null> {
    return this.prisma.assessment.findUnique({
      where: { id },
      include: ASSESSMENT_INCLUDE,
    });
  }

  count(where: Prisma.AssessmentWhereInput): Promise<number> {
    return this.prisma.assessment.count({ where });
  }

  countDecisions(where: Prisma.ReferralDecisionWhereInput): Promise<number> {
    return this.prisma.referralDecision.count({ where });
  }
}
