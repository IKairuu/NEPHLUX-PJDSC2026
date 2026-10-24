# Step 1 v3 (resident check): KNHANES 2019–2020 result

Judged against `PASS_MARK_STEP1_v3.md`. The frozen script and model were scored once on KNHANES 2019–2020, in the same run as Step 2U.
Hashes in the output match `analysis/step1_v3.FROZEN.sha256`. Full numbers: `results/step1_v3_test.json`; log: `results/step1_v3_score_log.txt`.

## Bottom line
- **v3-BHW (questions + a BP cuff reading + waist tape): passes all three criteria.** This is the first resident-level model to find more cases than the "diabetes or high BP" rule on a clean test.
- **v3-R (questions only): fails.** It ties the rule, which uses a measured BP. It is well calibrated, so it can stay as an awareness check.

Say: "tested on 11,047 Korean adults (KNHANES 2019–2020)". Never "validated in Filipinos".

## Test set
15,469 in the files → 12,614 aged 20+ → 12,575 not pregnant → 11,544 with uACR → 11,542 answered DM/BP → 11,427 no known kidney disease → **11,047 complete case, 912 cases (8.3%)**.
Learning data was KNHANES 2011–2014 + 2021–2024: 39,707 adults and 2,948 cases.

## Pass mark

| | v3-BHW | v3-R |
|---|---|---|
| 1. AUROC (CI lower bound > 0.70) | 0.778 (0.762–0.794) **pass** | 0.754 (0.735–0.769) **pass** |
| 2. Cases vs rule at the same 38.0% referred (CI excludes 0) | 685 vs 668, **+17 (+1 to +35) pass** | 660 vs 668, −8 (−29 to +15) **fail** |
| 3. Calibration (slope 0.8–1.2, CITL ±0.2) | slope 1.04 (0.98–1.10), CITL +0.04 **pass** | slope 1.05 (0.97–1.12), CITL +0.04 **pass** |
| **Overall** | **PASS** | **FAIL** |

Rule ("told diabetes OR told high BP OR BP medicine OR BP ≥ 140/90"): AUROC 0.692 (0.676–0.708).
Survey-weighted AUROC: v3-BHW 0.782, v3-R 0.754. Mean predicted risk was 8.0% against 8.3% observed, for both versions.
At the frozen "go to YAKAP" threshold: v3-BHW refers 64.6%, finds 91.6% of cases, PPV 11.7%. v3-R refers 70.5%, finds 90.8%, PPV 10.6%.
Secondary: v3-R vs the questions-only rule a resident can apply at home (29.7% referred, 582 cases): **+7** (no CI; not a criterion).

## By group (AUROC)

| | n / cases | v3-BHW | v3-R |
|---|---|---|---|
| Women | 6,030 / 491 | 0.752 | 0.733 |
| Men | 5,017 / 421 | 0.807 | 0.777 |
| Age < 50 | 4,781 / 194 | 0.729 | 0.689 |
| Age 50+ | 6,266 / 718 | 0.750 | 0.725 |

Weakest: women and adults under 50.

## Model
v3-BHW: gradient-boosted trees (LightGBM, 16 leaves, 200 trees), Platt-recalibrated on out-of-fold predictions.
Inputs: age, sex, diabetes (told, insulin, pills, years), high BP (told or on medicine, years), BP medicine, cholesterol, stroke/heart attack/angina, smoking (now, former), family diabetes, family high BP, BMI, alcohol frequency, self-rated health, measured SBP/DBP (mean of 3), waist.
It was picked from 15 candidates by leave-one-year-out inside the learning years (`CV_NOTES.md`).

## What it means for NEPHLUX
- v3-BHW needs someone with a BP cuff and a tape measure. Prototype v6 has no BHW role, so it fits at **clinic intake before labs**, or at a barangay BP station.
- The questions-only check stays **awareness only**.
- The gain is small: +17 cases per ~11,000 adults screened, a 2.5% relative gain over the rule's 668. The CI lower bound is +1.

## Limits
- Korean adults, not Filipino. Single spot urine.
- KNHANES measures BP with trained staff using a standard protocol, so a barangay reading may be noisier.
- The trees model is not a simple formula. The app needs the frozen model exported (or a lookup), and its explanations would use tree contributions rather than coefficients.
- KNHANES 2019–2020 is now spent for testing.
