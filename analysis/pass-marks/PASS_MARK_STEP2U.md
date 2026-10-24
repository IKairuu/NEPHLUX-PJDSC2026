# Pass mark for Step 2U (Step 2 + YAKAP urinalysis), version 1

Written before any Step 2U model was fitted, and before any outcome in the test years (KNHANES 2019–2020) was opened.
No date or time of passing is recorded in a pass mark (team rule); results go only in the results files.

## Why Step 2U exists
NHANES has no urine dipstick, so Step 2 cannot use the YAKAP urinalysis. KNHANES has both the dipstick and uACR for the
same people. Step 2U asks one question: **does adding the YAKAP dipstick to the Step 2 inputs find more early cases
than what a clinic would do anyway with that dipstick?**

## One change from the plan in the team's plan (made before fitting, from predictor data only)
The prompt said "learn on KNHANES 2011–2014". Before fitting, the dipstick columns were tabulated (no outcomes) and the
coding is **not the same across eras**:
- 2011–2014: protein has codes 0–4, blood 0–5, glucose 0–4; the share coded protein "1" swings from 3% to 13% by year.
- 2019–2024: protein 0–5, blood 0–4, glucose 0–5.
A model that learns a dipstick scale from 2011–2014 and is tested on a different scale in 2019–2020 would be judged on
the coding change, not on the idea. So Step 2U **learns from KNHANES 2021–2024** (same coding era as the test years).
2021–2024 is spent for testing but may be used for learning (as Step 1 v3 does). Consequences:
- There is **no 2021–2024 "second check"** for Step 2U.
- 2011–2014 is not used by Step 2U.

## Data and split
- **Learning:** KNHANES 2021, 2022, 2023, 2024.
- **Test (scored once, together with Step 1 v3):** KNHANES 2019–2020. Outcomes never opened.
- Raw files stay private (KDCA terms).

## Cohort and outcome
Exactly as `dev/knhanes_v1/analysis/knhanes_validate.py` (same harmonise fixes: BP mean of readings 1–3; BP medicine
codes 1–4; urine albumin below the reporting limit = limit/√2; CVD not asked in 2022–2023 set to the training mean;
codes 8/9 = no), **plus** a non-missing dipstick protein result. Outcome: uACR ≥ 30 mg/g, one spot urine.

## Dipstick coding (assumption, VERIFY against the KNHANES codebook before scoring)
2019–2024 codes are read as the standard six-step strip: 0 negative, 1 trace (±), 2 = 1+, 3 = 2+, 4 = 3+, 5 = 4+.
Inputs built from it:
- `pro_trace` (protein code 1), `pro_1` (code 2), `pro_2plus` (code ≥ 3)
- `bld_pos` (blood code ≥ 2), `glu_pos` (glucose code ≥ 2)
- `usg` specific gravity (clipped 1.000–1.040)

## Models (fixed; no tuning)
Both are L2 logistic regression, C = 1.0, standardised inputs, fitted on 2021–2024 only:
- **K2:** the 20 Step 2 design columns of `run_all.design(df, 2)` (Korean refit, no dipstick).
- **Step 2U:** K2's columns + the 6 dipstick inputs above.
Development check reported (not used to choose anything): leave-one-year-out AUROC over the 4 learning years.
Learning curve reported (not used to choose anything): leave-one-year-out AUROC when learning from 1, 2 and 3 years.

## Comparators on the test set
- **Main (C2): today's pathway with the dipstick** = frozen `run_all.rule_baseline()` (told diabetes OR told high BP OR
  BP medicine OR SBP ≥ 140 OR DBP ≥ 90) **OR dipstick protein ≥ 1+ (code ≥ 2)**.
- **K2** (C3), the frozen NHANES Step 2 (`web/model.js` v1.0.0) and the plain rule: reported.

## Pass criteria (judged on KNHANES 2019–2020)
1. **C1:** Step 2U AUROC, bootstrap 95% CI lower bound > 0.70.
2. **C2:** at the main comparator's referral share, Step 2U finds more uACR ≥ 30 cases, bootstrap 95% CI of the
   difference > 0.
3. **C3:** Step 2U beats K2 on AUROC, paired bootstrap 95% CI of the difference > 0.
4. **C4 (reported, decides whether the app shows a percentage):** calibration slope 0.8–1.2 and calibration-in-the-large
   between −0.2 and +0.2.

**Pass = C1 and C2 and C3.** If C4 fails, the app shows only bands, not a percentage.

Also reported, not criteria: survey-weighted AUROC (`wt_itvex` ÷ 2), results by sex, age 20–44 / 45–64 / 65+, and
people with neither diabetes nor high BP; extra cases and cost per case across budgets of 10–400 uACR tests per 1,000
adults (uACR price assumed PHP 600, range 300–1,200, as in the fact sheet); multiple-imputation check (5 imputations,
chained equations) versus complete case.

Seed 20261017, 1,000 bootstrap draws. The frozen script and model are hashed before scoring. Run once. A failure is
reported as a failure.
