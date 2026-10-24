import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DipstickGrade,
  RiskModel,
  dipstickProteinPositive,
  scoreStep2UFeatures,
  step2uLevel,
} from './risk-engine';

// Step 2U must give the same risk as the Python model (analysis/step2u.py).
// models/step2u_test_vectors.json holds 300 generated patients (not survey records)
// with the Python risk for each; the strip readings use the KNHANES coding.
const MODELS = join(__dirname, '..', '..', '..', '..', 'models');

interface Vector {
  x: Record<string, number>;
  u: { pro: string; bld: string; glu: string; sg: number | string };
  p: number;
}

const STEP2U = JSON.parse(
  readFileSync(join(MODELS, 'step2u_v1.json'), 'utf8'),
) as RiskModel & { thresholds: { refer: number } };
const VECTORS = JSON.parse(
  readFileSync(join(MODELS, 'step2u_test_vectors.json'), 'utf8'),
) as Vector[];

const GRADE: Record<string, DipstickGrade> = {
  neg: 'NEG',
  trace: 'TRACE',
  '1': 'ONE_PLUS',
  '2': 'TWO_PLUS',
  '3': 'THREE_PLUS',
};

const clip = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

// Same Step 2 features as the engine, from a vector that carries eGFR directly
function baseFeatures(x: Record<string, number>): Record<string, number> {
  const e = clip(x.egfr, 5, 150);
  return {
    age: x.age,
    age_sq: Math.pow(x.age - 50, 2) / 100,
    female: x.female,
    dm_hx: x.dm_hx,
    htn_hx: x.htn_hx,
    bp_med: x.bp_med,
    smoker: x.smoker,
    fam_dm: x.fam_dm,
    cvd_hx: x.cvd_hx,
    bmi: clip(x.bmi, 15, 60),
    sbp: clip(x.sbp, 80, 220),
    dbp: clip(x.dbp, 30, 130),
    hba1c: clip(x.hba1c, 4, 14),
    egfr: e,
    egfr_low: Math.max(0, 90 - e) / 10,
    tchol: clip(x.tchol, 80, 400),
    hdl: clip(x.hdl, 15, 120),
    hgb: clip(x.hgb, 6, 20),
    wbc: clip(x.wbc, 1, 25),
    plt: clip(x.plt, 20, 800),
  };
}

describe('Step 2U risk engine', () => {
  const model: RiskModel = {
    intercept: STEP2U.intercept,
    coef: STEP2U.coef,
    mean: STEP2U.mean,
  };

  it('matches the Python model on 300 generated patients', () => {
    const usable = VECTORS.filter((v) => GRADE[v.u.pro]);
    expect(usable.length).toBeGreaterThan(250);
    for (const v of usable) {
      const r = scoreStep2UFeatures(model, baseFeatures(v.x), {
        protein: GRADE[v.u.pro],
        blood: GRADE[v.u.bld] ?? null,
        glucose: GRADE[v.u.glu] ?? null,
        specificGravity: v.u.sg === '' ? null : Number(v.u.sg),
      });
      expect(Math.abs(r.probability - v.p)).toBeLessThan(1e-9);
    }
  });

  it('refers at the cut fixed on the learning data', () => {
    const t = { step2u_refer: STEP2U.thresholds.refer };
    expect(step2uLevel(t.step2u_refer, t)).toBe('HIGH');
    expect(step2uLevel(t.step2u_refer - 1e-6, t)).toBe('LOW');
  });

  it('treats dipstick protein 1+ or more as a referral', () => {
    expect(dipstickProteinPositive({ protein: 'TRACE' })).toBe(false);
    expect(dipstickProteinPositive({ protein: 'ONE_PLUS' })).toBe(true);
    expect(dipstickProteinPositive({ protein: 'THREE_PLUS' })).toBe(true);
  });
});
