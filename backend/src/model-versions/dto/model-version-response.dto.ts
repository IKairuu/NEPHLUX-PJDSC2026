import { ModelVersion } from '../../generated/prisma/client';

// For the Evidence screen. Coefficients and means are left out: the frontend does not need them.
export class ModelVersionResponseDto {
  id: string;
  version: string;
  step: number;
  stepName: string;
  testAuroc: number;
  ci: [number, number];
  thresholds: unknown;
  evidence: unknown;
  createdAt: Date;

  static fromModel(m: ModelVersion): ModelVersionResponseDto {
    return {
      id: m.id,
      version: m.version,
      step: m.step,
      stepName: m.step === 1 ? 'Resident questionnaire' : 'YAKAP labs',
      testAuroc: m.testAuroc,
      ci: [m.ciLow, m.ciHigh],
      thresholds: m.thresholds,
      evidence: m.evidence,
      createdAt: m.createdAt,
    };
  }
}
