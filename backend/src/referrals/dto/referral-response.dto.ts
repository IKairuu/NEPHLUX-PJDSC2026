import { PageMetaDto } from '../../common/dto/pagination-query.dto';
import {
  ClinicSector,
  Decision,
  RiskLevel,
  Sex,
} from '../../generated/prisma/client';
import { ReferralFull } from '../referrals.repository';

export class ReferralResponseDto {
  id: string;
  assessmentId: string;
  assessedOn: Date;
  decision: Decision;
  overrideReason: string | null;
  decidedBy: { id: string; fullName: string };
  decidedAt: Date;
  recheckDue: Date | null;
  slipPrintedAt: Date | null;
  patient: { initials: string; barangay: string };
  riskLevel: RiskLevel | null;
  probability: number | null;
  latestUacrMgG: number | null;

  static fromModel(d: ReferralFull): ReferralResponseDto {
    const a = d.assessment;
    return {
      id: d.id,
      assessmentId: a.id,
      assessedOn: a.assessedOn,
      decision: d.decision,
      overrideReason: d.overrideReason,
      decidedBy: d.decidedBy,
      decidedAt: d.decidedAt,
      recheckDue: d.recheckDue,
      slipPrintedAt: d.slipPrintedAt,
      patient: {
        initials: a.patient.initials,
        barangay: a.patient.barangay.name,
      },
      riskLevel: a.riskResult?.riskLevel ?? null,
      probability: a.riskResult?.probability ?? null,
      latestUacrMgG: a.uacrResults[0]?.valueMgG ?? null,
    };
  }
}

export class ReferralListResponseDto {
  data: ReferralResponseDto[];
  meta: PageMetaDto;
}

// Everything the frontend needs to print the uACR referral slip
export class ReferralSlipDto {
  referralId: string;
  date: Date;
  city: string;
  clinic: { name: string; sector: ClinicSector };
  patient: { initials: string; age: number; sex: Sex; barangay: string };
  residentCode: string | null;
  bloodPressure: { sbp: number; dbp: number };
  hba1cPct: number;
  creatinineMgDl: number;
  egfr: number;
  probability: number;
  riskLevel: RiskLevel;
  reasons: { text: string; direction: 'RAISES' | 'LOWERS' }[];
  request: string;
  doctorNote: string | null;
  returnTo: { clinic: string; nearestPublicClinic: string | null };
  doctorName: string;
  disclaimer: string;
}
