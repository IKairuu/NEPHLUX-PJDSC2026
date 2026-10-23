import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const FOLLOW_UP_INCLUDE = {
  assessment: {
    select: {
      id: true,
      patient: {
        select: {
          initials: true,
          barangay: { select: { id: true, name: true } },
        },
      },
      clinic: { select: { id: true, name: true, phone: true } },
      riskResult: { select: { riskLevel: true } },
      uacrResults: {
        orderBy: { recordedAt: 'desc' },
        take: 1,
        select: { valueMgG: true, recordedAt: true },
      },
    },
  },
} satisfies Prisma.ReferralDecisionInclude;

export type FollowUpDecision = Prisma.ReferralDecisionGetPayload<{
  include: typeof FOLLOW_UP_INCLUDE;
}>;

@Injectable()
export class FollowUpsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Every decision for patients living in one barangay (or the whole city)
  findDecisions(barangayId: number | null): Promise<FollowUpDecision[]> {
    return this.prisma.referralDecision.findMany({
      where: barangayId ? { assessment: { patient: { barangayId } } } : {},
      include: FOLLOW_UP_INCLUDE,
      orderBy: { decidedAt: 'asc' },
    });
  }
}
