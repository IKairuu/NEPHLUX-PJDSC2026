import { PageMetaDto } from '../../common/dto/pagination-query.dto';
import { reasonText } from '../../common/risk/risk-engine';
import {
  ClinicSector,
  Decision,
  DipstickGrade,
  LabUnits,
  RiskLevel,
  Sex,
  Suggestion,
} from '../../generated/prisma/client';
import { AssessmentFull } from '../assessments.repository';

export const SUGGESTION_TEXT: Record<Suggestion, string> = {
  REFER: 'Refer for a urine albumin-creatinine ratio (uACR) test.',
  CONSIDER_OR_REPEAT:
    'Consider a uACR test, or repeat YAKAP labs within 12 months.',
  ROUTINE: 'No referral suggested; routine yearly YAKAP check-up.',
};

export class AssessmentPatientDto {
  id: string;
  initials: string;
  sex: Sex;
  barangay: { id: number; name: string };
}

export class AssessmentReasonDto {
  rank: number;
  key: string;
  text: string;
  direction: 'RAISES' | 'LOWERS';
  contribution: number;
}

export class AssessmentRiskDto {
  probability: number;
  riskLevel: RiskLevel;
  egfr: number;
  suggestion: Suggestion;
  suggestionText: string;
  modelVersion: string;
  reasons: AssessmentReasonDto[];
}

export class AssessmentDecisionSummaryDto {
  id: string;
  decision: Decision;
  overrideReason: string | null;
  decidedAt: Date;
  recheckDue: Date | null;
}

export class AssessmentResponseDto {
  id: string;
  assessedOn: Date;
  clinic: { id: string; name: string; sector: ClinicSector };
  patient: AssessmentPatientDto;
  residentCode: string | null;
  codeConfirmed: boolean;
  inputs: {
    age: number;
    weightKg: number;
    heightCm: number;
    bmi: number;
    dmHx: boolean;
    htnHx: boolean;
    bpMed: boolean;
    cvdHx: boolean;
    smoker: boolean;
    famDm: boolean;
    sbp: number;
    dbp: number;
    labUnits: LabUnits;
    // stored in conventional units
    hba1cPct: number;
    creatinineMgDl: number;
    tcholMgDl: number;
    hdlMgDl: number;
    hgbGDl: number;
    wbc: number;
    platelets: number;
    dipProtein: DipstickGrade | null;
    dipBlood: DipstickGrade | null;
    dipGlucose: DipstickGrade | null;
    urineSg: number | null;
  };
  risk: AssessmentRiskDto | null;
  warnings: string[];
  decision: AssessmentDecisionSummaryDto | null;
  latestUacrMgG: number | null;
  createdAt: Date;

  static fromModel(a: AssessmentFull): AssessmentResponseDto {
    const r = a.riskResult;
    // yes/no answers as model inputs, so reasons read "No BP medicine" rather than "BP medicine"
    const features: Record<string, number> = {
      female: a.patient.sex === 'F' ? 1 : 0,
      dm_hx: a.dmHx ? 1 : 0,
      htn_hx: a.htnHx ? 1 : 0,
      bp_med: a.bpMed ? 1 : 0,
      cvd_hx: a.cvdHx ? 1 : 0,
      smoker: a.smoker ? 1 : 0,
      fam_dm: a.famDm ? 1 : 0,
    };
    const warnings: string[] = [];
    if (r && r.egfr < 60) {
      warnings.push(
        `eGFR ${Math.round(r.egfr)} is below 60. If it stays low for 3 months this alone meets the CKD threshold; manage per guideline whatever the score.`,
      );
    }
    if (!a.dipProtein) {
      warnings.push(
        'No urine dipstick result, so this uses Step 2 (blood tests only). Enter the YAKAP dipstick to use Step 2U, which found more cases on its test.',
      );
    }
    return {
      id: a.id,
      assessedOn: a.assessedOn,
      clinic: a.clinic,
      patient: {
        id: a.patient.id,
        initials: a.patient.initials,
        sex: a.patient.sex,
        barangay: a.patient.barangay,
      },
      residentCode: a.residentCode,
      codeConfirmed: a.codeConfirmed,
      inputs: {
        age: a.age,
        weightKg: a.weightKg,
        heightCm: a.heightCm,
        bmi: a.bmi,
        dmHx: a.dmHx,
        htnHx: a.htnHx,
        bpMed: a.bpMed,
        cvdHx: a.cvdHx,
        smoker: a.smoker,
        famDm: a.famDm,
        sbp: a.sbp,
        dbp: a.dbp,
        labUnits: a.labUnits,
        hba1cPct: a.hba1cPct,
        creatinineMgDl: a.creatinineMgDl,
        tcholMgDl: a.tcholMgDl,
        hdlMgDl: a.hdlMgDl,
        hgbGDl: a.hgbGDl,
        wbc: a.wbc,
        platelets: a.platelets,
        dipProtein: a.dipProtein,
        dipBlood: a.dipBlood,
        dipGlucose: a.dipGlucose,
        urineSg: a.urineSg,
      },
      risk: r
        ? {
            probability: r.probability,
            riskLevel: r.riskLevel,
            egfr: Math.round(r.egfr * 10) / 10,
            suggestion: r.suggestion,
            suggestionText: SUGGESTION_TEXT[r.suggestion],
            modelVersion: r.modelVersion.version,
            reasons: r.reasons.map((x) => ({
              rank: x.rank,
              key: x.featureKey,
              text: reasonText(x.featureKey, features),
              direction: x.contribution > 0 ? 'RAISES' : 'LOWERS',
              contribution: x.contribution,
            })),
          }
        : null,
      warnings,
      decision: a.decision
        ? {
            id: a.decision.id,
            decision: a.decision.decision,
            overrideReason: a.decision.overrideReason,
            decidedAt: a.decision.decidedAt,
            recheckDue: a.decision.recheckDue,
          }
        : null,
      latestUacrMgG: a.uacrResults[0]?.valueMgG ?? null,
      createdAt: a.createdAt,
    };
  }
}

export class AssessmentListResponseDto {
  data: AssessmentResponseDto[];
  meta: PageMetaDto;
}

export class AssessmentSummaryDto {
  waitingForDecision: number;
  reviewedLast30Days: number;
  referredLast30Days: number;
  myDecisions: number;
}
