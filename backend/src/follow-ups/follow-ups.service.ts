import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { SettingsService } from '../settings/settings.service';
import { FollowUpRowDto } from './dto/follow-up-response.dto';
import { FOLLOW_UP_TABS, FollowUpTab } from './dto/follow-up-query.dto';
import { FollowUpDecision, FollowUpsRepository } from './follow-ups.repository';

const DAY_MS = 24 * 60 * 60 * 1000;
const UACR_POSITIVE_MG_G = 30;

export const TAB_DESCRIPTION: Record<FollowUpTab, string> = {
  MISSED:
    'No uACR result after the follow-up window. Visit or text. Oldest first.',
  PENDING: 'Referred recently; the uACR result is not due yet.',
  OVERRIDES:
    'The doctor overrode a higher-risk result. Confirm the repeat labs.',
  RECHECK:
    'Moderate risk, not referred. Remind about YAKAP labs within 12 months.',
  DONE: 'uACR result recorded.',
};

export interface FollowUpLists {
  barangayId: number | null;
  missedAfterDays: number;
  tabs: Record<FollowUpTab, FollowUpRowDto[]>;
}

@Injectable()
export class FollowUpsService {
  constructor(
    private readonly repository: FollowUpsRepository,
    private readonly settings: SettingsService,
  ) {}

  // BHWs only ever see their own barangay; ADMIN may choose one or see all
  resolveBarangay(user: AuthUser, requested?: number): number | null {
    if (user.role === 'ADMIN') return requested ?? null;
    if (!user.barangayId) {
      throw new ForbiddenException('Your account is not linked to a barangay');
    }
    if (requested && requested !== user.barangayId) {
      throw new ForbiddenException('You can only see your own barangay');
    }
    return user.barangayId;
  }

  async lists(user: AuthUser, requested?: number): Promise<FollowUpLists> {
    const barangayId = this.resolveBarangay(user, requested);
    const missedAfterDays = await this.settings.getNumber('missed_after_days');
    const now = Date.now();
    const tabs: Record<FollowUpTab, FollowUpRowDto[]> = {
      MISSED: [],
      PENDING: [],
      OVERRIDES: [],
      RECHECK: [],
      DONE: [],
    };
    for (const d of await this.repository.findDecisions(barangayId)) {
      const row = toRow(d, now);
      const tab = tabFor(row, missedAfterDays);
      if (tab) tabs[tab].push(row);
    }
    // longest waiting first
    for (const t of FOLLOW_UP_TABS) {
      tabs[t].sort((a, b) => b.daysSinceDecision - a.daysSinceDecision);
    }
    return { barangayId, missedAfterDays, tabs };
  }
}

function tabFor(
  r: FollowUpRowDto,
  missedAfterDays: number,
): FollowUpTab | null {
  if (r.uacr) return 'DONE';
  if (r.decision === 'APPROVED') {
    return r.daysSinceDecision > missedAfterDays ? 'MISSED' : 'PENDING';
  }
  if (r.decision === 'OVERRIDDEN') return 'OVERRIDES';
  if (r.decision === 'NO_REFERRAL' && r.riskLevel === 'MODERATE')
    return 'RECHECK';
  return null; // low risk, no referral: routine yearly check-up, nothing to follow up
}

function toRow(d: FollowUpDecision, now: number): FollowUpRowDto {
  const a = d.assessment;
  const u = a.uacrResults[0];
  const days = Math.floor((now - d.decidedAt.getTime()) / DAY_MS);
  return {
    referralId: d.id,
    assessmentId: a.id,
    initials: a.patient.initials,
    barangay: a.patient.barangay,
    clinic: a.clinic,
    riskLevel: a.riskResult?.riskLevel ?? null,
    decision: d.decision,
    doctorNote: d.overrideReason,
    decidedAt: d.decidedAt,
    daysSinceDecision: days,
    over60Days: days > 60,
    recheckDue: d.recheckDue,
    uacr: u
      ? {
          valueMgG: u.valueMgG,
          recordedAt: u.recordedAt,
          suspectedAlbuminuria: u.valueMgG >= UACR_POSITIVE_MG_G,
        }
      : null,
    canRecordUacr: !u && d.decision !== 'NO_REFERRAL',
  };
}
