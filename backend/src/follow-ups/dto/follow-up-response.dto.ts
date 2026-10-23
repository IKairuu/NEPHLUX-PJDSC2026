import { PageMetaDto } from '../../common/dto/pagination-query.dto';
import { Decision, RiskLevel } from '../../generated/prisma/client';
import { FollowUpTab } from './follow-up-query.dto';

export class FollowUpRowDto {
  referralId: string;
  assessmentId: string;
  initials: string;
  barangay: { id: number; name: string };
  clinic: { id: string; name: string; phone: string | null };
  riskLevel: RiskLevel | null;
  decision: Decision;
  doctorNote: string | null;
  decidedAt: Date;
  daysSinceDecision: number;
  over60Days: boolean;
  recheckDue: Date | null;
  uacr: {
    valueMgG: number;
    recordedAt: Date;
    suspectedAlbuminuria: boolean;
  } | null;
  canRecordUacr: boolean;
}

export class FollowUpListResponseDto {
  tab: FollowUpTab;
  description: string;
  barangayId: number | null;
  data: FollowUpRowDto[];
  meta: PageMetaDto;
}

export class FollowUpSummaryDto {
  barangayId: number | null;
  missedAfterDays: number;
  counts: Record<FollowUpTab, number>;
}
