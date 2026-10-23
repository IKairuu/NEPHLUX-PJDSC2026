// Risk engine, ported unchanged from the prototype (BagoEngine). Pure functions, no storage, no network.
// Mirrors design() in analysis/run_all.py.
import { MODEL as M } from './model.js'

const clip = (x, lo, hi) => Math.min(hi, Math.max(lo, x))
const yn = (v) => (v ? 1 : 0)

// Race-free CKD-EPI 2021 creatinine equation (Inker et al., 2021). scr in mg/dL.
export function egfr(scr, age, female) {
  const k = female ? 0.7 : 0.9, a = female ? -0.241 : -0.302, r = scr / k
  return 142 * Math.pow(Math.min(r, 1), a) * Math.pow(Math.max(r, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1)
}

// Philippine labs often report SI units
export const units = {
  creatUmolToMg: (v) => v / 88.42,
  cholMmolToMg: (v) => v * 38.67,
  hgbGLToGdL: (v) => v / 10,
}

export function features(x, step) {
  const f = {
    age: x.age,
    age_sq: Math.pow(x.age - 50, 2) / 100,
    female: yn(x.female), dm_hx: yn(x.dm_hx), htn_hx: yn(x.htn_hx), bp_med: yn(x.bp_med),
    smoker: yn(x.smoker), fam_dm: yn(x.fam_dm), cvd_hx: yn(x.cvd_hx),
    bmi: clip(x.bmi, 15, 60),
  }
  if (step === 2) {
    const e = clip(x.egfr != null ? x.egfr : egfr(x.creat, x.age, x.female), 5, 150)
    f.sbp = clip(x.sbp, 80, 220); f.dbp = clip(x.dbp, 30, 130)
    f.hba1c = clip(x.hba1c, 4, 14)
    f.egfr = e; f.egfr_low = Math.max(0, 90 - e) / 10
    f.tchol = clip(x.tchol, 80, 400); f.hdl = clip(x.hdl, 15, 120)
    f.hgb = clip(x.hgb, 6, 20); f.wbc = clip(x.wbc, 1, 25); f.plt = clip(x.plt, 20, 800)
  }
  return f
}

export function score(x, step) {
  const m = step === 2 ? M.step2 : M.step1
  const f = features(x, step), contrib = {}
  let lp = m.intercept
  for (const k of Object.keys(m.coef)) {
    lp += m.coef[k] * f[k]
    contrib[k] = m.coef[k] * (f[k] - m.mean[k]) // exact SHAP for a linear-logit model
  }
  // merge the two age terms and the two eGFR terms into one plain-language reason each
  const merged = {}
  for (const k of Object.keys(contrib)) {
    const key = k === 'age_sq' ? 'age' : k === 'egfr_low' ? 'egfr' : k
    merged[key] = (merged[key] || 0) + contrib[k]
  }
  return { p: 1 / (1 + Math.exp(-lp)), logit: lp, features: f, contrib: merged }
}

export function level(p, step) {
  const t = M.thresholds
  if (step === 1) return p >= t.step1_go_to_yakap ? 'higher' : 'lower'
  if (p >= t.step2_high) return 'high'
  if (p >= t.step2_moderate) return 'moderate'
  return 'low'
}

const REASON_TEXT = {
  age: 'Age', female: 'Sex', dm_hx: 'Diabetes diagnosis', htn_hx: 'High blood pressure diagnosis',
  bp_med: 'BP medicine', smoker: 'Smoking', fam_dm: 'Family history of diabetes',
  cvd_hx: 'Past heart attack, stroke or heart failure', bmi: 'Body-mass index',
  sbp: 'Systolic blood pressure', dbp: 'Diastolic blood pressure', hba1c: 'HbA1c (blood sugar control)',
  egfr: 'Kidney filtration (eGFR from creatinine)', tchol: 'Total cholesterol', hdl: 'HDL cholesterol',
  hgb: 'Hemoglobin', wbc: 'White cell count', plt: 'Platelets',
}

export function reasons(r, n = 4) {
  return Object.keys(r.contrib)
    .map((k) => ({ key: k, text: k === 'female' ? (r.features.female ? 'Female sex' : 'Male sex') : (REASON_TEXT[k] || k), value: r.contrib[k] }))
    .filter((o) => Math.abs(o.value) >= 0.05)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, n)
}

// a "no" answer can still push the estimate up; say it as "No ..." so nobody reads it as a yes
const NO_TEXT = { bp_med: 'No BP medicine', dm_hx: 'No diabetes diagnosis', htn_hx: 'No high blood pressure diagnosis', smoker: 'Not smoking', fam_dm: 'No family history of diabetes', cvd_hx: 'No past heart attack, stroke or heart failure' }
export function reasonText(o, x) {
  return x && (x[o.key] === false || x[o.key] === 0) && NO_TEXT[o.key] ? NO_TEXT[o.key] : o.text
}

export function bmiFrom(weightKg, heightCm) {
  const h = heightCm / 100
  return weightKg / (h * h)
}
