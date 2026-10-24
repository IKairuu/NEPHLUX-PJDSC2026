// Test-set evidence used on the landing page. Values copied from BAGO_MODEL.evidence, which
// analysis/run_all.py generates; regenerate this file from the model output rather than editing numbers.
export const EV = {
  n: { train: 13840, test: 6655, train_cases: 1545, test_cases: 797 },
  prevalence: {
    test_cases_without_dm_or_htn_share: 0.23588456712672523,
    test_cases_with_egfr_ge60_share: 0.848180677540778,
  },
  test_auroc: {
    step1_lr: { auroc: 0.7179328379339902, ci: [0.6985790806588822, 0.7365605748450225] },
    step2_lr: { auroc: 0.7565961978450257, ci: [0.7371748387399245, 0.7747959287257039] },
    step2_gbt: { auroc: 0.7658331023687753, ci: [0.7475968982387885, 0.7837944765974854] },
    rule_dm_or_htn: { auroc: 0.6557859513290922, ci: [0.6389653042347285, 0.6705554873054225] },
    egfr_lt60_only: { auroc: 0.5528642532405362, ci: [0.5403634691550944, 0.5650392554227678] },
    age_only: { auroc: 0.64393136518688, ci: [0.6230480353114097, 0.6629123198783895] },
  },
  calibration_slope_step2: 0.9454104714042191,
  matched: {
    rule: { referred: 3260, cases_found: 609, sensitivity: 0.7641154328732748, ppv: 0.18680981595092025 },
    step1_lr: { referred: 3260, cases_found: 608, sensitivity: 0.7628607277289837, ppv: 0.18650306748466258 },
    step2_lr: { referred: 3260, cases_found: 641, sensitivity: 0.8042659974905897, ppv: 0.19662576687116565 },
  },
  asian: {
    n: 789, cases: 88,
    step1_lr: { auroc: 0.7188270003890544, ci: [0.664392941628933, 0.7738757328609803] },
    step2_lr: { auroc: 0.7411976397354428, ci: [0.6890134817553272, 0.7920729950586719] },
    rule_dm_or_htn: { auroc: 0.6632570354039684, ci: [0.6138183033194735, 0.712414259046695] },
  },
  // each row adds one group of YAKAP tests to the one before
  ablation: [
    { model: 'questionnaire only', auroc: 0.7179328379339902 },
    { model: '+ measured BP', auroc: 0.7265862981400463 },
    { model: '+ HbA1c', auroc: 0.7415954246313742 },
    { model: '+ creatinine (eGFR)', auroc: 0.7504406889440729 },
    { model: '+ lipid profile', auroc: 0.7502125802075297 },
    { model: '+ CBC (full step 2)', auroc: 0.7565961978450257 },
  ],
  // per 1,000 adults screened; uACR price assumed ₱600 (₱300–1,200)
  cost_per_1000: {
    test_everyone_uacr: { uacr_tests: 1000, cases_found: 119.7595792637115, cases_missed: 0, cost_base: 600000, cost_per_case_base: 5010.037641154328 },
    rule_dm_or_htn: { uacr_tests: 489.8572501878287, cases_found: 91.51014274981218, cases_missed: 28.249436513899326, cost_base: 293914.3501126972, cost_per_case_base: 3211.822660098522 },
    step2_model_same_referrals: { uacr_tests: 489.8572501878287, cases_found: 96.31855747558227, cases_missed: 23.441021788129234, cost_base: 293914.3501126972, cost_per_case_base: 3051.482059282371 },
    two_step_pathway_fixed_thresholds: { uacr_tests: 468.069120961683, cases_found: 94.51540195341848, cases_missed: 25.244177310293026, cost_base: 280841.4725770098, cost_per_case_base: 2971.383147853737 },
  },
  hd_per_year: 990600,
  extra_cases_step2: [32, 12.0, 51.02499999999998],
  pathway_per100: {
    cases: 11.97595792637115,
    step1_sent_to_yakap: 79.72952667167543,
    step2_referred_uacr: 46.8069120961683,
    step2_cases_found: 9.451540195341849,
  },
  pass_mark: {
    'c1_auroc_ci_lower_gt_0.70': true,
    c2_more_cases_than_rule_at_same_referrals: true,
    'c3_calibration_slope_0.8_1.2': true,
    'step1_auroc_ci_lower_gt_0.70': false,
    step1_more_cases_than_rule: false,
  },
}

// Step 2U: the Step 2 labs plus the YAKAP urine dipstick (protein, blood, glucose, specific gravity).
// Learned on Korean KNHANES 2021–2024, frozen, scored once on KNHANES 2019–2020. Copied from BAGO_STEP2U.test (prototype v7).
// The comparator is "diabetes, high BP or dipstick protein 1+", which refers the same share of adults.
export const STEP2U = {
  n: 11047, cases: 912,
  refer_at: 0.02548847146444033, // "refer" cut, fixed on the learning years only
  auroc: { auroc: 0.9173551787708047, ci: [0.9085198097672762, 0.9262496494540894] },
  auroc_comparator: { auroc: 0.7345796657405725, ci: [0.721437518800494, 0.7482264265034898] },
  auroc_rule: { auroc: 0.6921284155133764, ci: [0.6762469278507534, 0.7076945054263598] },
  auroc_step2: { auroc: 0.7794123629250729, ci: [0.7634800404265877, 0.7946961007132614] }, // labs-only model on the same Korean adults
  comparator_share: 0.394134154068978,
  matched: {
    comparator: { cases_found: 752, sensitivity: 0.8245614035087719 },
    step2u: { cases_found: 846, sensitivity: 0.9276315789473685, extra: 94, extra_ci: [72, 118] },
  },
  calibration: { slope: 1.018906327282837, citl: -0.0528979939022203 },
  pass: { c1_c3: true, c4_calibration: true },
  no_dm_no_htn: { step2u_sensitivity: 0.8032786885245902, comparator_sensitivity: 0.3442622950819672 },
  step2_vs_plain_rule: { extra: 21, extra_ci: [-1, 41] }, // without the dipstick: not clearly better
  budget50: { model: 39.73929573639902, comparator: 9.142753688784286, cost_per_case_model: 754.9202733485193, cost_per_case_comparator: 3281.2871287128714 },
}

// Resident check version 2: a second look at an already-used test set, with its pass mark written first (23 Oct 2026)
export const STEP1_V2 = {
  rule_cases_found: 609,
  rows: [
    { name: 'v1 · 10 questions', auroc: 0.7179328379339902, ci: [0.6985790806588822, 0.7365605748450225], found: 608, gain: -1, pass: false },
    { name: 'v2 · + 5 more questions', auroc: 0.7182472638731878, ci: [0.6995974748129966, 0.7366851805430034], found: 611, gain: 2, pass: false },
    { name: 'v2 · + clinic BP and waist', auroc: 0.7280594736235618, ci: [0.7090016865533743, 0.7478802855701597], found: 616, gain: 7, pass: false },
  ],
}

// uACR budget curve: cases of uACR ≥30 mg/g found per 1,000 adults when testing 0, 10, 20 … 1,000 of them,
// on the held-out NHANES 2017–March 2020 test set with the frozen step-2 model.
const MODEL_FOUND = [0, 7.06, 12.17, 17.73, 21.64, 24.79, 27.8, 31.25, 34.71, 38.32, 41.02, 43.73, 45.68, 47.93, 50.64, 52.89, 55.15, 57.55, 59.5, 61.01,
  62.36, 63.56, 64.31, 65.66, 67.32, 69.42, 71.68, 73.18, 74.08, 75.28, 76.48, 78.14, 80.09, 81.14, 81.74, 83.25, 84.3, 84.75, 86.1, 87.15,
  88.05, 88.96, 89.41, 89.71, 90.91, 92.86, 93.61, 94.52, 95.27, 96.32, 97.07, 97.52, 98.42, 98.87, 99.32, 99.92, 100.83, 101.13, 102.03, 102.78,
  103.38, 103.68, 104.43, 104.88, 105.03, 105.03, 105.33, 105.94, 106.39, 107.14, 107.59, 107.89, 108.79, 109.69, 109.99, 110.74, 111.95, 112.4, 112.7, 112.7,
  113.45, 113.6, 113.6, 113.75, 113.9, 114.35, 114.35, 114.5, 114.95, 115.25, 115.85, 116.0, 116.6, 117.36, 117.96, 117.96, 118.56, 118.86, 119.01, 119.46, 119.76]
const RULE_FOUND = [0, 1.88, 3.73, 5.61, 7.47, 9.35, 11.2, 13.08, 14.93, 16.81, 18.7, 20.55, 22.43, 24.28, 26.16, 28.01, 29.9, 31.75, 33.63, 35.48,
  37.36, 39.24, 41.1, 42.98, 44.83, 46.71, 48.56, 50.44, 52.3, 54.18, 56.03, 57.91, 59.79, 61.64, 63.52, 65.38, 67.26, 69.11, 70.99, 72.84,
  74.72, 76.6, 78.46, 80.34, 82.19, 84.07, 85.92, 87.8, 89.66, 91.52, 92.08, 92.63, 93.18, 93.73, 94.29, 94.84, 95.4, 95.95, 96.5, 97.05,
  97.61, 98.17, 98.72, 99.27, 99.82, 100.38, 100.93, 101.49, 102.04, 102.59, 103.14, 103.7, 104.26, 104.81, 105.36, 105.91, 106.47, 107.02, 107.58, 108.13,
  108.68, 109.24, 109.79, 110.35, 110.9, 111.46, 112.0, 112.56, 113.11, 113.67, 114.23, 114.78, 115.33, 115.88, 116.44, 116.99, 117.55, 118.1, 118.65, 119.2, 119.76]
export const BUDGET = {
  casesPer1000: 119.7595792637115,
  pricePeso: 600,
  // testing at random finds cases at the base rate, so that line is computed rather than stored
  rows: MODEL_FOUND.map((model, i) => ({
    tests: i * 10, model, rule: RULE_FOUND[i], random: Math.round(119.7595792637115 * i) / 100,
  })),
}

// PhilHealth YAKAP accredited providers in Cagayan de Oro, 30 Sep 2026
export const CLINIC_COUNT = 42
// PSGC 2023 barangays of Cagayan de Oro City
export const BARANGAY_COUNT = 80
