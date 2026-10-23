import { ResidentQuestion } from '../resident-check.questions';

export class BarangayRefDto {
  id: number;
  name: string;
}

export class ReasonDto {
  key: string;
  text: string;
}

export class NearbyClinicDto {
  id: string;
  yakapRef: string;
  name: string;
  shortName: string | null;
  sector: 'PUBLIC' | 'PRIVATE';
  phone: string | null;
  address: string | null;
  barangayName: string;
  lat: number;
  lon: number;
  locationPrecision: 'APPROXIMATE' | 'EXACT';
  distanceKm: number;
  cost: string;
}

export class ResidentCheckResponseDto {
  level: 'HIGHER' | 'LOWER';
  headline: string;
  advice: string;
  reasons: ReasonDto[];
  code: string;
  barangay: BarangayRefDto | null;
  nearestClinics: NearbyClinicDto[];
  modelVersion: string;
  disclaimer: string;
}

export class DecodedAnswersDto {
  age: number;
  female: boolean;
  dmHx: boolean;
  htnHx: boolean;
  bpMed: boolean;
  cvdHx: boolean;
  smoker: boolean;
  famDm: boolean;
  weightKg: number;
  heightCm: number;
  bmi: number;
}

export class DecodedCodeResponseDto {
  code: string;
  answers: DecodedAnswersDto;
  barangay: BarangayRefDto | null;
}

export class QuestionsResponseDto {
  count: number;
  questions: ResidentQuestion[];
}
