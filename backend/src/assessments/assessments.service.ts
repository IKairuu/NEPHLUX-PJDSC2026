import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { BarangaysService } from '../barangays/barangays.service';
import { decodeClinicCode } from '../common/clinic-code/clinic-code';
import { ActiveModel, parseModelVersion } from '../common/risk/model-version';
import {
  SI_TO_CONVENTIONAL,
  Step2Level,
  bmiFrom,
  egfr,
  reasons,
  scoreStep2,
  step2Level,
} from '../common/risk/risk-engine';
import { Prisma, Suggestion } from '../generated/prisma/client';
import {
  AssessmentFull,
  AssessmentsRepository,
} from './assessments.repository';
import { AssessmentQueryDto } from './dto/assessment-query.dto';
import { AssessmentSummaryDto } from './dto/assessment-response.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

const STEP_LABS = 2;
const REASON_COUNT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const SUGGESTION_FOR: Record<Step2Level, Suggestion> = {
  HIGH: 'REFER',
  MODERATE: 'CONSIDER_OR_REPEAT',
  LOW: 'ROUTINE',
};

// Plausible ranges in conventional units; outside them the units were probably mixed up
const LAB_RANGES: Record<string, [number, number, string]> = {
  creatinineMgDl: [0.2, 15, 'Creatinine'],
  tcholMgDl: [50, 700, 'Total cholesterol'],
  hdlMgDl: [10, 200, 'HDL cholesterol'],
  hgbGDl: [3, 25, 'Hemoglobin'],
};

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly repository: AssessmentsRepository,
    private readonly barangaysService: BarangaysService,
  ) {}

  async create(
    dto: CreateAssessmentDto,
    user: AuthUser,
  ): Promise<AssessmentFull> {
    if (!user.clinicId) {
      throw new ForbiddenException(
        'Your account is not linked to a YAKAP clinic',
      );
    }
    const patient = await this.resolvePatient(dto);
    const residentCode = this.checkResidentCode(dto);
    const labs = this.toConventional(dto);
    const active = await this.loadActiveModel();

    const bmi = bmiFrom(dto.weightKg, dto.heightCm);
    const inputs = { ...dto, ...labs, bmi };
    const score = scoreStep2(active.model, inputs);
    const level = step2Level(score.probability, active.thresholds);

    return this.repository.createWithRisk(
      {
        clinicId: user.clinicId,
        doctorId: user.id,
        residentCode,
        codeConfirmed: residentCode !== null,
        age: dto.age,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        bmi: Math.round(bmi * 10) / 10,
        dmHx: dto.dmHx,
        htnHx: dto.htnHx,
        bpMed: dto.bpMed,
        cvdHx: dto.cvdHx,
        smoker: dto.smoker,
        famDm: dto.famDm,
        sbp: Math.round(dto.sbp),
        dbp: Math.round(dto.dbp),
        labUnits: dto.labUnits,
        ...labs,
        wbc: dto.wbc,
        platelets: dto.platelets,
      },
      patient,
      {
        modelVersionId: active.id,
        probability: score.probability,
        riskLevel: level,
        egfr: egfr(labs.creatinineMgDl, dto.age, dto.female),
        suggestion: SUGGESTION_FOR[level],
        reasons: reasons(score, REASON_COUNT).map((r, i) => ({
          rank: i + 1,
          featureKey: r.key,
          contribution: r.value,
        })),
      },
    );
  }

  async findAll(
    query: AssessmentQueryDto,
    user: AuthUser,
  ): Promise<[AssessmentFull[], number]> {
    const where: Prisma.AssessmentWhereInput = {
      ...this.clinicScope(user),
      ...(query.status === 'PENDING' && { decision: { is: null } }),
      ...(query.status === 'DECIDED' && { decision: { isNot: null } }),
      ...(query.riskLevel && { riskResult: { riskLevel: query.riskLevel } }),
    };
    return this.repository.findMany(
      where,
      (query.page - 1) * query.limit,
      query.limit,
    );
  }

  async findOne(id: string, user: AuthUser): Promise<AssessmentFull> {
    const a = await this.repository.findById(id);
    // same answer for "missing" and "another clinic's" so ids cannot be probed
    if (!a || (user.role !== 'ADMIN' && a.clinicId !== user.clinicId)) {
      throw new NotFoundException(`Assessment ${id} not found`);
    }
    return a;
  }

  async summary(user: AuthUser): Promise<AssessmentSummaryDto> {
    const scope = this.clinicScope(user);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const [waiting, reviewed, referred, mine] = await Promise.all([
      this.repository.count({ ...scope, decision: { is: null } }),
      this.repository.count({ ...scope, assessedOn: { gte: since } }),
      this.repository.countDecisions({
        decision: 'APPROVED',
        decidedAt: { gte: since },
        assessment: scope,
      }),
      this.repository.countDecisions({ decidedById: user.id }),
    ]);
    return {
      waitingForDecision: waiting,
      reviewedLast30Days: reviewed,
      referredLast30Days: referred,
      myDecisions: mine,
    };
  }

  // Doctors see their own clinic; ADMIN sees every clinic
  private clinicScope(user: AuthUser): Prisma.AssessmentWhereInput {
    if (user.role === 'ADMIN') return {};
    if (!user.clinicId) {
      throw new ForbiddenException(
        'Your account is not linked to a YAKAP clinic',
      );
    }
    return { clinicId: user.clinicId };
  }

  private async resolvePatient(
    dto: CreateAssessmentDto,
  ): Promise<{ id: string } | Prisma.PatientUncheckedCreateInput> {
    if (dto.patientId) {
      const p = await this.repository.findPatientById(dto.patientId);
      if (!p) throw new NotFoundException(`Patient ${dto.patientId} not found`);
      return { id: p.id };
    }
    // DTO validation guarantees both when there is no patientId
    const barangay = await this.barangaysService.findOne(dto.barangayId!);
    return {
      initials: normalizeInitials(dto.initials!),
      sex: dto.female ? 'F' : 'M',
      barangayId: barangay.id,
    };
  }

  private checkResidentCode(dto: CreateAssessmentDto): string | null {
    if (!dto.residentCode?.trim()) return null;
    const decoded = decodeClinicCode(dto.residentCode);
    if (!decoded.ok) throw new BadRequestException(decoded.error);
    if (!dto.codeConfirmed) {
      throw new BadRequestException(
        "Confirm the resident's answers with the patient first",
      );
    }
    const s = dto.residentCode.toUpperCase().replace(/[\s-]/g, '');
    return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
  }

  private toConventional(dto: CreateAssessmentDto) {
    const si = dto.labUnits === 'SI';
    const labs = {
      hba1cPct: dto.hba1cPct,
      creatinineMgDl: si
        ? SI_TO_CONVENTIONAL.creatinineUmolLToMgDl(dto.creatinine)
        : dto.creatinine,
      tcholMgDl: si
        ? SI_TO_CONVENTIONAL.cholesterolMmolLToMgDl(dto.totalCholesterol)
        : dto.totalCholesterol,
      hdlMgDl: si
        ? SI_TO_CONVENTIONAL.cholesterolMmolLToMgDl(dto.hdl)
        : dto.hdl,
      hgbGDl: si
        ? SI_TO_CONVENTIONAL.hemoglobinGLToGdL(dto.hemoglobin)
        : dto.hemoglobin,
    };
    const bad = Object.entries(LAB_RANGES)
      .filter(([k, [lo, hi]]) => {
        const v = labs[k as keyof typeof labs];
        return v < lo || v > hi;
      })
      .map(([, [, , label]]) => label);
    if (bad.length) {
      throw new BadRequestException(
        `${bad.join(', ')} out of range. Check the lab units (labUnits is ${dto.labUnits}).`,
      );
    }
    return labs;
  }

  private async loadActiveModel(): Promise<ActiveModel> {
    const row = await this.repository.findActiveModelVersion(STEP_LABS);
    if (!row) {
      throw new ServiceUnavailableException(
        'No active lab model. Run the database seed first.',
      );
    }
    const parsed = parseModelVersion(row);
    if (!parsed) {
      throw new InternalServerErrorException(
        `Model version ${row.version} (step ${row.step}) is malformed`,
      );
    }
    return parsed;
  }
}

// "rs", "R S", "r.s." -> "R.S."
function normalizeInitials(raw: string): string {
  return (
    raw
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .split('')
      .join('.') + '.'
  );
}
