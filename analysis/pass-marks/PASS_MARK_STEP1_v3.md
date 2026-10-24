# Pass mark for the resident check (Step 1), version 3

Written before any v3 model was fitted, and before any outcome in the test years was opened.

## Why there is a version 3
Step 1 v1 and v2 were trained on US adults (NHANES 2011–2016). On the NHANES 2017–2020 test and the KNHANES
2021–2024 test they found no more uACR ≥ 30 cases than the rule at the same number of referrals (v1 −53,
v2 −52, v2 + health-worker BP −3 on KNHANES). They stay reported as failed. v3 is a new model, judged on its own.

Three changes:
1. **Learns from Asian adults.** Training is KNHANES (Korea) only. The KNHANES 2021–2024 test is spent for testing,
   but a spent test set may be used for learning.
2. **More questions a resident can answer**, all asked in every KNHANES year used (list below).
3. **Model choice is made inside the training years only** (leave-one-year-out), from a fixed list of candidates.

## Data and split
- **Learning data:** KNHANES 2011, 2012, 2013, 2014, 2021, 2022, 2023, 2024 (the years with urine albumin other than
  the test years; 2015–2018 have no urine albumin).
- **Test set (scored once):** KNHANES 2019–2020. Its outcomes have never been opened. It is shared with the Step 2U
  urinalysis model; both frozen scripts are scored together in one run.
- **Not used:** NHANES. Optional secondary test, reported but not part of the pass: NHANES August 2021–August 2023,
  if the team downloads it on the team's machine (never scored by anyone).

## Cohort and outcome (same as `dev/knhanes_v1/analysis/knhanes_validate.py`)
Adults 20+, not pregnant, has uACR, answered the diabetes and high-BP questions, no known kidney disease
(`DN1_dg`; in 2011–2012 the item is "renal failure"), complete BMI, BP and the Step 2 labs (so both test reports
use the same people). Outcome: uACR ≥ 30 mg/g from one spot urine. Urine creatinine is `HE_UCREA` in 2011, 2013 and
2014, and `HE_Ucrea` in the other years. Urine albumin below the reporting limit (2021–2024 flag `HE_Ualb_etc`) is set to
limit/√2, as before. Questionnaire codes 8 (not applicable) and 9 (don't know) count as "no" for yes/no items.

## Inputs
**v3-R (resident alone, no measurement):**
age, age² ((age−50)²/100), female; told diabetes; diabetes insulin; diabetes pills; years since diabetes diagnosis
(0 if none or unknown, capped at 40); **high BP = told high BP OR takes BP medicine**; takes BP medicine; years since
high-BP diagnosis (same rule); told high cholesterol/dyslipidaemia; past stroke, heart attack or angina (not asked in
2022–2023: set to the training mean for those years); current smoker; former smoker; parent or sibling with diabetes;
parent or sibling with high BP; BMI; alcohol frequency in the past year (0 none to 5 four or more times a week);
self-rated health (1 very good to 5 very bad; "don't know" set to 3).

**v3-BHW (with a barangay health worker's tape and BP cuff):** v3-R plus measured systolic and diastolic BP (mean of
readings 1–3) and waist circumference (missing set to the training median).

Income and education are left out on purpose, so the score does not rate people by how poor they are.

**BP-medicine input rule (fixes the "BP medicine yes, high BP no" case).** In NHANES and KNHANES, the BP-medicine
question is asked only of people told they have high BP, so no model has seen "medicine yes, high BP no". In v3,
anyone taking BP medicine counts as having high BP (the usual epidemiology definition). The app asks the
medicine question only after "yes" to high BP, and a "yes" to medicine sets high BP to yes.

## Candidates (fixed list; each variant gets its own pick)
- **A.** L2 logistic regression, standardised inputs, C ∈ {0.01, 0.1, 1}.
- **B.** A plus five pre-set interactions: age×diabetes, age×high BP, diabetes×high BP, age×female, BMI×diabetes.
  C ∈ {0.01, 0.1, 1}.
- **C.** Gradient-boosted trees (LightGBM): num_leaves ∈ {4, 8, 16} × trees ∈ {200, 400, 800}; learning rate 0.03,
  min_child_samples 100, subsample 0.8 (bagging every tree), colsample 0.8, reg_lambda 1.
That is 15 candidates per variant.

**How the pick is made (training years only):** leave-one-year-out over the 8 learning years. In each held-out year,
refer the same share as the rule refers in that year and count cases found minus the rule's cases. The candidate with
the largest total over the 8 years wins; ties go to the higher mean AUROC across years. The winner is refitted on all
8 years. Its probabilities are then recalibrated with a logistic (Platt) fit on its out-of-fold predictions, and the
fitted calibration intercept and slope are frozen with the model.
The training threshold "go to YAKAP" = the score that keeps ≥ 90% of training cases (out-of-fold), frozen.

## Comparators
- **Primary:** the frozen rule from `run_all.rule_baseline()`: told diabetes OR told high BP OR takes BP medicine OR
  measured SBP ≥ 140 OR DBP ≥ 90. This is the same rule as every earlier result and as the Step 2U report.
- **Secondary (v3-R only, reported, not a pass criterion):** the questions-only rule a resident can use at home:
  told diabetes OR told high BP OR takes BP medicine.

## Pass criteria (each variant judged on its own, on KNHANES 2019–2020)
1. AUROC: lower bound of the bootstrap 95% CI > 0.70.
2. At the primary rule's referral share, it finds more uACR ≥ 30 cases than the rule, and the bootstrap 95% CI of
   the difference excludes 0.
3. Calibration: slope between 0.8 and 1.2 and calibration-in-the-large between −0.2 and +0.2.

Pass = 1 and 2. Criterion 3 decides whether the app may show a percentage to residents; if it fails, the app shows only
"go to YAKAP / lower risk".
Also reported (not criteria): survey-weighted AUROC (`wt_itvex` ÷ number of pooled years), sensitivity and PPV at the
frozen threshold, cases versus the secondary rule, and results by sex and by age under/over 50.

Seed 20261017, 1,000 bootstrap draws. The frozen script's sha256 is recorded before the run. Run once. No change after
scoring; a failure is reported as a failure, and the resident check stays "awareness only".
