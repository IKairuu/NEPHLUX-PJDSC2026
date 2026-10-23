import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const RESULT_INCLUDE = {
  recordedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.UacrResultInclude;

export type UacrResultWithRecorder = Prisma.UacrResultGetPayload<{
  include: typeof RESULT_INCLUDE;
}>;

export interface AssessmentForUacr {
  id: string;
  clinicId: string;
  patient: { barangayId: number };
  decision: { decision: string } | null;
  _count: { uacrResults: number };
}

@Injectable()
export class UacrResultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAssessment(id: string): Promise<AssessmentForUacr | null> {
    return this.prisma.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        clinicId: true,
        patient: { select: { barangayId: true } },
        decision: { select: { decision: true } },
        _count: { select: { uacrResults: true } },
      },
    });
  }

  // Saves the result and an audit entry in one transaction
  create(
    data: Prisma.UacrResultUncheckedCreateInput,
  ): Promise<UacrResultWithRecorder> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.uacrResult.create({
        data,
        include: RESULT_INCLUDE,
      });
      await tx.auditLog.create({
        data: {
          userId: data.recordedById,
          action: 'RECORD_UACR',
          entity: 'uacr_results',
          entityId: created.id,
          details: { assessmentId: data.assessmentId },
        },
      });
      return created;
    });
  }

  findByAssessment(assessmentId: string): Promise<UacrResultWithRecorder[]> {
    return this.prisma.uacrResult.findMany({
      where: { assessmentId },
      include: RESULT_INCLUDE,
      orderBy: { recordedAt: 'desc' },
    });
  }
}
