import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentsService } from '../assessments/assessments.service';
import { AuthUser } from '../auth/auth-user';
import { BarangaysService } from '../barangays/barangays.service';
import { haversineKm } from '../common/geo/haversine';
import { reasonText } from '../common/risk/risk-engine';
import { Prisma } from '../generated/prisma/client';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ReferralQueryDto } from './dto/referral-query.dto';
import { ReferralSlipDto } from './dto/referral-response.dto';
import { ReferralFull, ReferralsRepository } from './referrals.repository';

const MIN_REASON_LENGTH = 5;
const RECHECK_MONTHS = 12;

@Injectable()
export class ReferralsService {
  constructor(
    private readonly repository: ReferralsRepository,
    private readonly assessmentsService: AssessmentsService,
    private readonly barangaysService: BarangaysService,
  ) {}

  // Decision rules, by the model's suggestion:
  //   REFER              APPROVED, or OVERRIDDEN with a reason (declining is an override)
  //   CONSIDER_OR_REPEAT APPROVED, or NO_REFERRAL (recheck labs in 12 months)
  //   ROUTINE            NO_REFERRAL, or APPROVED with a reason (referring against the suggestion)
  async create(dto: CreateReferralDto, user: AuthUser): Promise<ReferralFull> {
    // also enforces that the assessment belongs to the doctor's clinic
    const a = await this.assessmentsService.findOne(dto.assessmentId, user);
    if (a.decision) {
      throw new ConflictException('This assessment already has a decision');
    }
    if (!a.riskResult) {
      throw new BadRequestException('This assessment has no risk estimate');
    }
    const suggestion = a.riskResult.suggestion;
    const reason = dto.overrideReason?.trim() || null;
    const needReason = () => {
      if (!reason || reason.length < MIN_REASON_LENGTH) {
        throw new BadRequestException('Give a reason for this decision');
      }
    };

    switch (dto.decision) {
      case 'OVERRIDDEN':
        if (suggestion !== 'REFER') {
          throw new BadRequestException(
            'Override is only for declining a suggested referral; use NO_REFERRAL',
          );
        }
        needReason();
        break;
      case 'NO_REFERRAL':
        if (suggestion === 'REFER') {
          throw new BadRequestException(
            'The model suggests a referral; declining it is an OVERRIDDEN decision with a reason',
          );
        }
        break;
      case 'APPROVED':
        if (suggestion === 'ROUTINE') needReason();
        break;
    }

    const recheckDue =
      dto.decision === 'NO_REFERRAL' && a.riskResult.riskLevel === 'MODERATE'
        ? addMonths(a.assessedOn, RECHECK_MONTHS)
        : null;

    return this.repository.create({
      assessmentId: a.id,
      decision: dto.decision,
      overrideReason: reason,
      decidedById: user.id,
      recheckDue,
    });
  }

  findAll(
    query: ReferralQueryDto,
    user: AuthUser,
  ): Promise<[ReferralFull[], number]> {
    const where: Prisma.ReferralDecisionWhereInput = {
      assessment: this.clinicScope(user),
      ...(query.decision && { decision: query.decision }),
    };
    return this.repository.findMany(
      where,
      (query.page - 1) * query.limit,
      query.limit,
    );
  }

  async findOne(id: string, user: AuthUser): Promise<ReferralFull> {
    const d = await this.repository.findById(id);
    if (
      !d ||
      (user.role !== 'ADMIN' && d.assessment.clinicId !== user.clinicId)
    ) {
      throw new NotFoundException(`Referral ${id} not found`);
    }
    return d;
  }

  async slip(id: string, user: AuthUser): Promise<ReferralSlipDto> {
    const d = await this.findOne(id, user);
    if (d.decision === 'NO_REFERRAL') {
      throw new BadRequestException(
        'There is no slip for a no-referral decision',
      );
    }
    const a = d.assessment;
    const r = a.riskResult!;
    const clinic = a.clinic;
    const features: Record<string, number> = {
      female: a.patient.sex === 'F' ? 1 : 0,
      dm_hx: +a.dmHx,
      htn_hx: +a.htnHx,
      bp_med: +a.bpMed,
      cvd_hx: +a.cvdHx,
      smoker: +a.smoker,
      fam_dm: +a.famDm,
    };
    return {
      referralId: d.id,
      date: d.decidedAt,
      city: 'Cagayan de Oro City',
      clinic: { name: clinic.name, sector: clinic.sector },
      patient: {
        initials: a.patient.initials,
        age: a.age,
        sex: a.patient.sex,
        barangay: a.patient.barangay.name,
      },
      residentCode: a.residentCode,
      bloodPressure: { sbp: a.sbp, dbp: a.dbp },
      hba1cPct: a.hba1cPct,
      creatinineMgDl: Math.round(a.creatinineMgDl * 100) / 100,
      egfr: Math.round(r.egfr),
      probability: r.probability,
      riskLevel: r.riskLevel,
      reasons: r.reasons.slice(0, 4).map((x) => ({
        text: reasonText(x.featureKey, features),
        direction: x.contribution > 0 ? 'RAISES' : 'LOWERS',
      })),
      request:
        'Spot uACR, first-morning sample preferred. A single result of 30 mg/g or more is suspected albuminuria, not a diagnosis: repeat within 3 months; if confirmed, or if eGFR is below 60, refer to a nephrologist.',
      doctorNote: d.overrideReason,
      returnTo: {
        clinic: clinic.name,
        nearestPublicClinic:
          clinic.sector === 'PUBLIC'
            ? null
            : await this.nearestPublicClinic(a.patient.barangay.id),
      },
      doctorName: d.decidedBy.fullName,
      disclaimer:
        'Screening support from a model trained on U.S. NHANES data, not yet validated in Filipino patients; not a diagnosis. uACR is not part of the YAKAP benefit, so the patient may need to pay for it unless the City Health Office covers it.',
    };
  }

  async markSlipPrinted(id: string, user: AuthUser): Promise<ReferralFull> {
    const d = await this.findOne(id, user);
    if (d.decision === 'NO_REFERRAL') {
      throw new BadRequestException(
        'There is no slip for a no-referral decision',
      );
    }
    return this.repository.markSlipPrinted(id, user.id);
  }

  private clinicScope(user: AuthUser): Prisma.AssessmentWhereInput {
    if (user.role === 'ADMIN') return {};
    if (!user.clinicId) {
      throw new ForbiddenException(
        'Your account is not linked to a YAKAP clinic',
      );
    }
    return { clinicId: user.clinicId };
  }

  private async nearestPublicClinic(
    barangayId: number,
  ): Promise<string | null> {
    const b = await this.barangaysService.findOne(barangayId);
    if (b.centreLat === null || b.centreLon === null) return null;
    const from: [number, number] = [b.centreLat, b.centreLon];
    const clinics = await this.repository.findPublicClinics();
    let best: { name: string; km: number } | null = null;
    for (const c of clinics) {
      const km = haversineKm(from, [c.lat, c.lon]);
      if (!best || km < best.km) best = { name: c.name, km };
    }
    return best?.name ?? null;
  }
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}
