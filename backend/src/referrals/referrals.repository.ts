import { Injectable } from '@nestjs/common';
import { Clinic, Prisma } from '../generated/prisma/client';
import { ASSESSMENT_INCLUDE } from '../assessments/assessments.repository';
import { PrismaService } from '../prisma/prisma.service';

export const REFERRAL_INCLUDE = {
  assessment: { include: ASSESSMENT_INCLUDE },
  decidedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.ReferralDecisionInclude;

export type ReferralFull = Prisma.ReferralDecisionGetPayload<{
  include: typeof REFERRAL_INCLUDE;
}>;

@Injectable()
export class ReferralsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Saves the decision and an audit entry in one transaction
  create(
    data: Prisma.ReferralDecisionUncheckedCreateInput,
  ): Promise<ReferralFull> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.referralDecision.create({
        data,
        include: REFERRAL_INCLUDE,
      });
      await tx.auditLog.create({
        data: {
          userId: data.decidedById,
          action: 'SAVE_DECISION',
          entity: 'referral_decisions',
          entityId: created.id,
          details: { decision: data.decision },
        },
      });
      return created;
    });
  }

  findMany(
    where: Prisma.ReferralDecisionWhereInput,
    skip: number,
    take: number,
  ): Promise<[ReferralFull[], number]> {
    return this.prisma.$transaction([
      this.prisma.referralDecision.findMany({
        where,
        include: REFERRAL_INCLUDE,
        orderBy: { decidedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.referralDecision.count({ where }),
    ]);
  }

  findById(id: string): Promise<ReferralFull | null> {
    return this.prisma.referralDecision.findUnique({
      where: { id },
      include: REFERRAL_INCLUDE,
    });
  }

  markSlipPrinted(id: string, userId: string): Promise<ReferralFull> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.referralDecision.update({
        where: { id },
        data: { slipPrintedAt: new Date() },
        include: REFERRAL_INCLUDE,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'PRINT_SLIP',
          entity: 'referral_decisions',
          entityId: id,
        },
      });
      return updated;
    });
  }

  findPublicClinics(): Promise<Clinic[]> {
    return this.prisma.clinic.findMany({ where: { sector: 'PUBLIC' } });
  }
}
