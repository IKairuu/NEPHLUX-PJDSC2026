// Risk engine for the two-step pathway. Pure functions, no storage, no network.
// Step 1 and Step 2: logistic regression trained on NHANES. Step 2U: Step 2 plus the
// YAKAP urine dipstick, learned on KNHANES 2021-2024 (models/step2u_v1.json).

export interface RiskModel {
  intercept: number;
  coef: Record<string, number>;
  mean: Record<string, number>;
}

export interface RiskThresholds {
  step1_go_to_yakap: number;
  step2_high: number;
  step2_moderate: number;
}

export interface Step1Input {
  age: number;
  female: boolean;
  dmHx: boolean;
  htnHx: boolean;
  bpMed: boolean;
  cvdHx: boolean;
  smoker: boolean;
  famDm: boolean;
  bmi: number;
}

export interface Step2Input extends Step1Input {
  sbp: number;
  dbp: number;
  hba1cPct: number;
  creatinineMgDl: number;
  tcholMgDl: number;
  hdlMgDl: number;
  hgbGDl: number;
  wbc: number;
  platelets: number;
}

// YAKAP urine dipstick readings
export type DipstickGrade = 'NEG' | 'TRACE' | 'ONE_PLUS' | 'TWO_PLUS' | 'THREE_PLUS';

export interface DipstickInput {
  protein: DipstickGrade;
  blood?: DipstickGrade | null;
  glucose?: DipstickGrade | null;
  specificGravity?: number | null;
}

export interface Step2UThresholds {
  step2u_refer: number;
}

export interface RiskScore {
  probability: number;
  features: Record<string, number>;
  contributions: Record<string, number>;
}

export interface RiskReasonItem {
  key: string;
  text: string;
  value: number;
}

export type Step1Level = 'HIGHER' | 'LOWER';
export type Step2Level = 'HIGH' | 'MODERATE' | 'LOW';

const REASON_TEXT: Record<string, string> = {
  age: 'Age',
  dm_hx: 'Diabetes diagnosis',
  htn_hx: 'High blood pressure diagnosis',
  bp_med: 'BP medicine',
  smoker: 'Smoking',
  fam_dm: 'Family history of diabetes',
  cvd_hx: 'Past heart attack, stroke or heart failure',
  bmi: 'Body-mass index',
  sbp: 'Systolic blood pressure',
  dbp: 'Diastolic blood pressure',
  hba1c: 'HbA1c (blood sugar control)',
  egfr: 'Kidney filtration (eGFR from creatinine)',
  tchol: 'Total cholesterol',
  hdl: 'HDL cholesterol',
  hgb: 'Hemoglobin',
  wbc: 'White cell count',
  plt: 'Platelets',
  protein: 'Urine dipstick protein',
  bld_pos: 'Urine dipstick blood',
  glu_pos: 'Urine dipstick glucose',
  usg: 'Urine specific gravity',
};

// A "no" answer can still raise the estimate; say it as "No ..." so nobody reads it as a yes
const NO_TEXT: Record<string, string> = {
  bp_med: 'No BP medicine',
  dm_hx: 'No diabetes diagnosis',
  htn_hx: 'No high blood pressure diagnosis',
  smoker: 'Not smoking',
  fam_dm: 'No family history of diabetes',
  cvd_hx: 'No past heart attack, stroke or heart failure',
};

function clip(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function yn(v: boolean): number {
  return v ? 1 : 0;
}

export function bmiFrom(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

// Race-free CKD-EPI 2021 creatinine equation (Inker et al., 2021). scr in mg/dL.
export function egfr(scr: number, age: number, female: boolean): number {
  const k = female ? 0.7 : 0.9;
  const a = female ? -0.241 : -0.302;
  const r = scr / k;
  return (
    142 *
    Math.pow(Math.min(r, 1), a) *
    Math.pow(Math.max(r, 1), -1.2) *
    Math.pow(0.9938, age) *
    (female ? 1.012 : 1)
  );
}

function step1Features(x: Step1Input): Record<string, number> {
  return {
    age: x.age,
    age_sq: Math.pow(x.age - 50, 2) / 100,
    female: yn(x.female),
    dm_hx: yn(x.dmHx),
    htn_hx: yn(x.htnHx),
    bp_med: yn(x.bpMed),
    smoker: yn(x.smoker),
    fam_dm: yn(x.famDm),
    cvd_hx: yn(x.cvdHx),
    bmi: clip(x.bmi, 15, 60),
  };
}

function step2Features(x: Step2Input): Record<string, number> {
  const e = clip(egfr(x.creatinineMgDl, x.age, x.female), 5, 150);
  return {
    ...step1Features(x),
    sbp: clip(x.sbp, 80, 220),
    dbp: clip(x.dbp, 30, 130),
    hba1c: clip(x.hba1cPct, 4, 14),
    egfr: e,
    egfr_low: Math.max(0, 90 - e) / 10,
    tchol: clip(x.tcholMgDl, 80, 400),
    hdl: clip(x.hdlMgDl, 15, 120),
    hgb: clip(x.hgbGDl, 6, 20),
    wbc: clip(x.wbc, 1, 25),
    plt: clip(x.platelets, 20, 800),
  };
}

// Strip reading -> KNHANES code (0 negative, 1 trace, 2 = 1+, 3 = 2+, 4 = 3+ or more)
const DIP_CODE: Record<DipstickGrade, number> = {
  NEG: 0,
  TRACE: 1,
  ONE_PLUS: 2,
  TWO_PLUS: 3,
  THREE_PLUS: 4,
};

// Dipstick terms of Step 2U. A missing blood, glucose or specific gravity result is
// left out here and set to the learning-data mean in scoreStep2U.
export function dipstickFeatures(u: DipstickInput): Record<string, number> {
  const p = DIP_CODE[u.protein];
  const f: Record<string, number> = {
    pro_trace: p === 1 ? 1 : 0,
    pro_1: p === 2 ? 1 : 0,
    pro_2plus: p >= 3 ? 1 : 0,
  };
  if (u.blood) f.bld_pos = DIP_CODE[u.blood] >= 2 ? 1 : 0;
  if (u.glucose) f.glu_pos = DIP_CODE[u.glucose] >= 2 ? 1 : 0;
  if (u.specificGravity != null && Number.isFinite(u.specificGravity)) {
    f.usg = clip(u.specificGravity, 1.0, 1.04);
  }
  return f;
}

// Dipstick protein 1+ or more means refer for uACR whatever the score
export function dipstickProteinPositive(u: DipstickInput): boolean {
  return DIP_CODE[u.protein] >= 2;
}

function score(model: RiskModel, f: Record<string, number>): RiskScore {
  let lp = model.intercept;
  const merged: Record<string, number> = {};
  for (const k of Object.keys(model.coef)) {
    const value = f[k];
    if (value === undefined) {
      throw new Error(`Model term "${k}" has no matching feature`);
    }
    lp += model.coef[k] * value;
    // exact SHAP for a linear-logit model; age_sq, egfr_low and the protein grades fold into one reason each
    const key =
      k === 'age_sq'
        ? 'age'
        : k === 'egfr_low'
          ? 'egfr'
          : k.startsWith('pro_')
            ? 'protein'
            : k;
    merged[key] = (merged[key] ?? 0) + model.coef[k] * (value - model.mean[k]);
  }
  return {
    probability: 1 / (1 + Math.exp(-lp)),
    features: f,
    contributions: merged,
  };
}

export function scoreStep1(model: RiskModel, x: Step1Input): RiskScore {
  return score(model, step1Features(x));
}

export function scoreStep2(model: RiskModel, x: Step2Input): RiskScore {
  return score(model, step2Features(x));
}

// Scores already-built Step 2 features plus the dipstick. Exported for the test that
// compares the engine with the Python model.
export function scoreStep2UFeatures(
  model: RiskModel,
  base: Record<string, number>,
  u: DipstickInput,
): RiskScore & { filled: string[] } {
  const f = { ...base, ...dipstickFeatures(u) };
  const filled: string[] = [];
  for (const k of ['bld_pos', 'glu_pos', 'usg']) {
    if (f[k] === undefined) {
      f[k] = model.mean[k];
      filled.push(k);
    }
  }
  return { ...score(model, f), filled };
}

export function scoreStep2U(
  model: RiskModel,
  x: Step2Input,
  u: DipstickInput,
): RiskScore & { filled: string[] } {
  return scoreStep2UFeatures(model, step2Features(x), u);
}

// Two bands: the refer cut refers the same share of the KNHANES learning data as
// "diabetes, high BP or dipstick protein 1+", so there is no separate moderate band.
export function step2uLevel(p: number, t: Step2UThresholds): Step2Level {
  return p >= t.step2u_refer ? 'HIGH' : 'LOW';
}

export function step1Level(p: number, t: RiskThresholds): Step1Level {
  return p >= t.step1_go_to_yakap ? 'HIGHER' : 'LOWER';
}

// Lab unit conversions (Philippine labs often report SI units)
export const SI_TO_CONVENTIONAL = {
  creatinineUmolLToMgDl: (v: number) => v / 88.42,
  cholesterolMmolLToMgDl: (v: number) => v * 38.67,
  hemoglobinGLToGdL: (v: number) => v / 10,
};

export function step2Level(p: number, t: RiskThresholds): Step2Level {
  if (p >= t.step2_high) return 'HIGH';
  if (p >= t.step2_moderate) return 'MODERATE';
  return 'LOW';
}

// Plain-language label for a reason; features are the model inputs (0/1 for yes/no answers)
export function reasonText(
  key: string,
  features: Record<string, number>,
): string {
  if (key === 'female') return features.female ? 'Female sex' : 'Male sex';
  if (features[key] === 0 && NO_TEXT[key]) return NO_TEXT[key];
  return REASON_TEXT[key] ?? key;
}

// Largest contributions first; ignores anything under 0.05 on the logit scale
export function reasons(r: RiskScore, n = 4): RiskReasonItem[] {
  return Object.keys(r.contributions)
    .map((key) => ({
      key,
      text: reasonText(key, r.features),
      value: r.contributions[key],
    }))
    .filter((o) => Math.abs(o.value) >= 0.05)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, n);
}
