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
    rule_dm_or_htn: { auroc: 0.6557859513290922, ci: [0.6389653042347285, 0.6705554873054225] },
  },
  calibration_slope_step2: 0.9454104714042191,
  matched: {
    rule: { referred: 3260, cases_found: 609 },
    step1_lr: { referred: 3260, cases_found: 608 },
    step2_lr: { referred: 3260, cases_found: 641 },
  },
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

// PhilHealth YAKAP accredited providers in Cagayan de Oro, 30 Sep 2026
export const CLINIC_COUNT = 42
