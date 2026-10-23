import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ModelVersion } from '../generated/prisma/client';
import { BarangayRow } from '../barangays/barangays.repository';
import { BarangaysService } from '../barangays/barangays.service';
import {
  decodeClinicCode,
  encodeClinicCode,
} from '../common/clinic-code/clinic-code';
import {
  RiskModel,
  RiskThresholds,
  bmiFrom,
  reasons,
  scoreStep1,
  step1Level,
} from '../common/risk/risk-engine';
import { CreateResidentCheckDto } from './dto/create-resident-check.dto';
import {
  DecodedCodeResponseDto,
  NearbyClinicDto,
  QuestionsResponseDto,
  ResidentCheckResponseDto,
} from './dto/resident-check-response.dto';
import {
  ClinicWithBarangay,
  ResidentCheckRepository,
} from './resident-check.repository';
import { RESIDENT_QUESTIONS } from './resident-check.questions';

const STEP_RESIDENT = 1;
const NEAREST_COUNT = 3;

const DISCLAIMER =
  'This check is awareness only and is not a diagnosis. In testing, the questions alone did no ' +
  'better than asking about diabetes and blood pressure, so the YAKAP clinic, with your lab tests, ' +
  'decides who gets the urine test. Built from U.S. survey data; not yet validated in Filipino ' +
  'patients. Nothing you entered was saved.';

interface ActiveModel {
  version: string;
  model: RiskModel;
  thresholds: RiskThresholds;
}

@Injectable()
export class ResidentCheckService {
  constructor(
    private readonly repository: ResidentCheckRepository,
    private readonly barangaysService: BarangaysService,
  ) {}

  getQuestions(): QuestionsResponseDto {
    return { count: RESIDENT_QUESTIONS.length, questions: RESIDENT_QUESTIONS };
  }

  // Scores the answers and returns the result. Stores nothing and logs nothing.
  async check(dto: CreateResidentCheckDto): Promise<ResidentCheckResponseDto> {
    const barangay = dto.barangayId
      ? await this.barangaysService.findOne(dto.barangayId)
      : null;
    const { version, model, thresholds } = await this.loadActiveModel();

    const bmi = bmiFrom(dto.weightKg, dto.heightCm);
    const score = scoreStep1(model, { ...dto, bmi });
    const level = step1Level(score.probability, thresholds);
    const higher = level === 'HIGHER';

    const code = encodeClinicCode({
      ...dto,
      barangayCodeIndex: barangay?.codeIndex ?? 0,
    });

    return {
      level,
      headline: higher
        ? 'Your answers suggest a higher chance of early kidney damage.'
        : 'Your answers suggest a lower chance of early kidney damage.',
      advice: higher
        ? 'This is not a diagnosis. It means a doctor should look at your kidneys. Book a YAKAP check-up (free at public clinics) and ask about kidney tests.'
        : 'This is not a diagnosis, and a lower chance is not zero. A yearly YAKAP check-up (free at public clinics) is still the best way to catch problems early.',
      // only what pushed the estimate up, as in the prototype
      reasons: reasons(score, 8)
        .filter((r) => r.value > 0)
        .slice(0, 4)
        .map(({ key, text }) => ({ key, text })),
      code,
      barangay: barangay ? { id: barangay.id, name: barangay.name } : null,
      nearestClinics: barangay ? await this.nearestClinics(barangay) : [],
      modelVersion: version,
      disclaimer: DISCLAIMER,
    };
  }

  // Clinic staff type the resident's code to load their answers
  async decode(code: string): Promise<DecodedCodeResponseDto> {
    const result = decodeClinicCode(code);
    if (!result.ok) throw new BadRequestException(result.error);
    const a = result.answers;
    const barangay = a.barangayCodeIndex
      ? await this.barangaysService.findByCodeIndex(a.barangayCodeIndex)
      : null;
    return {
      code: encodeClinicCode(a),
      answers: {
        age: a.age,
        female: a.female,
        dmHx: a.dmHx,
        htnHx: a.htnHx,
        bpMed: a.bpMed,
        cvdHx: a.cvdHx,
        smoker: a.smoker,
        famDm: a.famDm,
        weightKg: a.weightKg,
        heightCm: a.heightCm,
        bmi: Math.round(bmiFrom(a.weightKg, a.heightCm) * 10) / 10,
      },
      barangay: barangay ? { id: barangay.id, name: barangay.name } : null,
    };
  }

  // The three nearest clinics, plus the nearest public one when none of those is public
  private async nearestClinics(
    barangay: BarangayRow,
  ): Promise<NearbyClinicDto[]> {
    if (barangay.centreLat === null || barangay.centreLon === null) return [];
    const from: [number, number] = [barangay.centreLat, barangay.centreLon];
    const sorted = (await this.repository.findClinicsWithBarangay())
      .map((c) => ({ c, km: haversineKm(from, [c.lat, c.lon]) }))
      .sort((a, b) => a.km - b.km);
    const picked = sorted.slice(0, NEAREST_COUNT);
    if (!picked.some((x) => x.c.sector === 'PUBLIC')) {
      const pub = sorted.find((x) => x.c.sector === 'PUBLIC');
      if (pub) picked.push(pub);
    }
    return picked.map(({ c, km }) => toNearbyClinic(c, km));
  }

  private async loadActiveModel(): Promise<ActiveModel> {
    const row = await this.repository.findActiveModelVersion(STEP_RESIDENT);
    if (!row) {
      throw new ServiceUnavailableException(
        'No active resident-check model. Run the database seed first.',
      );
    }
    return parseModelVersion(row);
  }
}

function parseModelVersion(row: ModelVersion): ActiveModel {
  const coefficients = row.coefficients as {
    intercept?: unknown;
    coef?: unknown;
  } | null;
  const means = row.means as Record<string, number> | null;
  const thresholds = row.thresholds as unknown as RiskThresholds | null;
  if (
    typeof coefficients?.intercept !== 'number' ||
    typeof coefficients.coef !== 'object' ||
    coefficients.coef === null ||
    !means ||
    typeof thresholds?.step1_go_to_yakap !== 'number'
  ) {
    throw new InternalServerErrorException(
      `Model version ${row.version} (step ${row.step}) is malformed`,
    );
  }
  return {
    version: row.version,
    model: {
      intercept: coefficients.intercept,
      coef: coefficients.coef as Record<string, number>,
      mean: means,
    },
    thresholds,
  };
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLon = (b[1] - a[1]) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toNearbyClinic(c: ClinicWithBarangay, km: number): NearbyClinicDto {
  return {
    id: c.id,
    yakapRef: c.yakapRef,
    name: c.name,
    shortName: c.shortName,
    sector: c.sector,
    phone: c.phone,
    address: c.address,
    barangayName: c.barangay.name,
    lat: c.lat,
    lon: c.lon,
    locationPrecision: c.locationPrecision,
    distanceKm: Math.round(km * 10) / 10,
    cost:
      c.sector === 'PUBLIC'
        ? 'YAKAP check-up free at this public clinic'
        : 'Private clinic: may charge up to ₱900 a year for YAKAP',
  };
}
