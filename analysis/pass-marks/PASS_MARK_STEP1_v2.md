# Pass mark for the resident check, version 2 — written BEFORE fitting or scoring it

Date written: 2026-10-23, before any step-1 v2 model was fitted or scored.

## Why there is a version 2
Step 1 v1 (the 10-question resident check) failed its pass mark in `PASS_MARK.md`: on the NHANES
2017–March 2020 test set it found 608 cases vs the rule's 609 at equal referrals. v1 stays reported as
failed. v2 is a new, separately judged model. Nothing in v1's results is re-scored.

## What is honest and what is not
- The NHANES 2017–2020 test set has already been looked at for step 1 v1. v2's feature list below was chosen
  from domain knowledge and from what a resident or barangay health worker can answer or measure, **not**
  from test-set results. Even so, a v2 score on that test set is a **second look at a used test set**, and
  it is reported with that label.
- The clean test for v2 is external: KNHANES (see `PASS_MARK_KNHANES.md`), run once, later.

## Outcome, cohort, split
Same as `PASS_MARK.md` and `analysis/run_all.py`: uACR ≥ 30 mg/g; adults 20+ (the analysis uses 20+;
`PASS_MARK.md` said 18+, see README "Deviations"); not pregnant; no known kidney disease or dialysis;
same complete-case cohort. Train NHANES 2011–2016; test 2017–March 2020.

## Two pre-specified variants (fixed lists, no feature selection)
- **v2-R (resident alone, no measurement):** v1 inputs (age, age², sex, told diabetes, told high BP, BP
  medicine, current smoker, family diabetes, heart attack/stroke/heart failure, BMI from self-reported
  weight and height) **plus** diabetes medicine (insulin or pills: DIQ050, DIQ070), told prediabetes
  (DIQ160), told high cholesterol (BPQ080), ever smoked 100 cigarettes (SMQ020), waking at night to
  urinate 2+ times (KIQ480).
- **v2-BHW (with a barangay health worker's BP reading):** v2-R **plus** measured systolic and diastolic
  BP (mean of readings).

Model: L2 logistic regression, C = 1.0, standardised inputs, same as v1. Answers of "refused" or "don't
know" count as "no", same as v1. Development check: 5-fold cross-validated AUROC on 2011–2016 only.

## Pass criteria (each variant judged on its own)
1. Test AUROC: lower bound of the bootstrap 95% CI > 0.70.
2. At the same share sent on as the rule "diabetes or high BP" (the rule's referral share), it finds more
   uACR ≥ 30 cases than the rule, with the bootstrap 95% CI of the difference excluding 0.
3. Its job is "who should come to a YAKAP clinic", so also reported (not a pass criterion): sensitivity at
   the training-set threshold that keeps ≥ 90% of training cases.

Seed 20261017, 1,000 bootstrap draws. If a variant fails, it is reported as failed and the resident check
stays "awareness only". No re-specification after scoring.
