import { ModelVersion } from '../../generated/prisma/client';
import { RiskModel, RiskThresholds } from './risk-engine';

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
