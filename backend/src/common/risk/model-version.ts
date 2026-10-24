import { ModelVersion } from '../../generated/prisma/client';
import { RiskModel, RiskThresholds, Step2UThresholds } from './risk-engine';

// model_versions.step values
export const STEP_RESIDENT = 1;
export const STEP_LABS = 2;
export const STEP_LABS_DIPSTICK = 3;

export interface ActiveStep2UModel {
  id: string;
  version: string;
  model: RiskModel;
  thresholds: Step2UThresholds;
}

// Reads a step-3 (Step 2U) row. Returns null when the stored JSON does not have that shape.
export function parseStep2UVersion(
  row: ModelVersion,
): ActiveStep2UModel | null {
  const coefficients = row.coefficients as {
    intercept?: unknown;
    coef?: unknown;
  } | null;
  const means = row.means as Record<string, number> | null;
  const t = row.thresholds as Partial<Step2UThresholds> | null;
  if (
    typeof coefficients?.intercept !== 'number' ||
    typeof coefficients.coef !== 'object' ||
    coefficients.coef === null ||
    typeof means !== 'object' ||
    means === null ||
    typeof t?.step2u_refer !== 'number'
  ) {
    return null;
  }
  return {
    id: row.id,
    version: row.version,
    model: {
      intercept: coefficients.intercept,
      coef: coefficients.coef as Record<string, number>,
      mean: means,
    },
    thresholds: { step2u_refer: t.step2u_refer },
  };
}

export interface ActiveModel {
  id: string;
  version: string;
  model: RiskModel;
  thresholds: RiskThresholds;
}

// Reads a model_versions row (coefficients = { intercept, coef }, means, thresholds).
// Returns null when the stored JSON does not have that shape.
export function parseModelVersion(row: ModelVersion): ActiveModel | null {
  const coefficients = row.coefficients as {
    intercept?: unknown;
    coef?: unknown;
  } | null;
  const means = row.means as Record<string, number> | null;
  const t = row.thresholds as Partial<RiskThresholds> | null;
  if (
    typeof coefficients?.intercept !== 'number' ||
    typeof coefficients.coef !== 'object' ||
    coefficients.coef === null ||
    typeof means !== 'object' ||
    means === null ||
    typeof t?.step1_go_to_yakap !== 'number' ||
    typeof t.step2_high !== 'number' ||
    typeof t.step2_moderate !== 'number'
  ) {
    return null;
  }
  return {
    id: row.id,
    version: row.version,
    model: {
      intercept: coefficients.intercept,
      coef: coefficients.coef as Record<string, number>,
      mean: means,
    },
    thresholds: t as RiskThresholds,
  };
}
