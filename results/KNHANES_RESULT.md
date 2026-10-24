# KNHANES outside test (Korea): result

Run once on 23 Oct 2026 against `PASS_MARK_KNHANES.md` (written before any KNHANES file was opened).
Script: `analysis/knhanes_validate.py`, sha256 `6c4c5133…4d20aa`, frozen before the run (`analysis/knhanes_validate.FROZEN.sha256`).
Full numbers: `results/knhanes.json`. Seed 20261017, 1,000 bootstrap draws. Nothing refitted; NHANES coefficients from `web/model.js` v1.0.0.

## Bottom line
**Step 2 passes the two main criteria on Korean adults and fails calibration.**
It ranks risk well (AUROC 0.784, 95% CI 0.772–0.796) and finds more cases than the rule at the same number of referrals (+28, 95% CI +5 to +53).
But its risks are too high for Korea: mean predicted 9.1% vs 6.8% observed, and the calibration slope is 1.26 (1.19–1.32), outside the 0.8–1.2 range.
So the ranking carries over; the percentages shown to a patient would need local recalibration.

Say: "tested on 20,465 Korean adults (KNHANES 2021–2024), an Asian national sample". Never "validated in Filipinos".

## Pass mark (step 2, YAKAP labs + BP + history)

| Criterion | Result | Verdict |
|---|---|---|
| 1. AUROC CI lower bound > 0.70 | 0.784 (0.772–0.796); survey-weighted 0.781 | **Pass** |
| 2. More cases than the rule at the same referrals, CI excludes 0 | 1,097 vs 1,069 of 1,394; +28 (+5 to +53) | **Pass** |
| 3. Calibration slope 0.8–1.2 | 1.26 (1.19–1.32); calibration-in-the-large −0.34 (−0.40 to −0.28) | **Fail** |

As in `PASS_MARK.md`, criterion 3 is "reported regardless" and the overall pass rests on 1 and 2. Report the calibration failure in the paper anyway.

At the same 39.6% referred: sensitivity 78.7% vs 76.7%, PPV 13.5% vs 13.2%, referrals per case found 7.38 vs 7.58.
At the app's fixed NHANES "higher risk" threshold: 40.1% referred, 79.2% of cases found, PPV 13.5%.

**Recalibration (separate, never in place of the frozen result):** intercept and slope refitted on a random half (intercept 0.15, slope 1.24); on the other half slope 1.03 (0.95–1.10), calibration-in-the-large −0.05 (−0.14 to +0.03), mean predicted 7.0% vs 6.7% observed.

## Secondary models (same 20,465 adults)

| Model | AUROC (95% CI) | Cases vs rule at same referrals |
|---|---|---|
| Step 1 v1 (questionnaire) | 0.740 (0.727–0.754); weighted 0.746 | −53 (−82 to −25): **fails** |
| Step 1 v2 resident | 0.738 (0.723–0.752) | −52 (−81 to −26): **fails** |
| Step 1 v2 + BHW BP | 0.766 (0.754–0.779) | −3 (−25 to +19): ties the rule |
| Rule: diabetes or high BP | 0.699 (0.688–0.710) | — |

Step 1 v1 calibration: slope 1.11 (1.04–1.17), mean predicted 10.5% vs 6.8% observed.
The resident check stays awareness only, as before.

## Cohort
27,281 in the files → 23,044 aged 20+ → 22,980 not pregnant → 21,987 with uACR → 21,982 answered diabetes/BP → 21,522 no known kidney disease → **20,465 complete case, 1,394 cases** (6.8% unweighted, 5.8% survey-weighted).
By year (n / cases): 2021 5,170 / 414; 2022 4,695 / 292; 2023 5,263 / 333; 2024 5,337 / 355.
Mean age 53.8; 55.7% women; 12.2% told they have diabetes; 27.9% told they have high BP; 2.5% eGFR < 60.
87% of cases had eGFR ≥ 60 and 23% had neither diabetes nor high BP (NHANES test: 85% and 24%).

## Variable check and deviations (fixed before the run)
All 23 names marked VERIFY exist in the files with the expected labels. Changes:
1. **BP:** KNHANES `HE_sbp`/`HE_dbp` average readings 2 and 3 only, so the mean of readings 1–3 is used, as in NHANES.
2. **BP medicine:** `DI1_2` codes 1–4 (takes it any number of days a month) count as "taking", matching NHANES "now taking"; the draft used daily only.
3. **Urine albumin below the reporting limit** is blank in `HE_Ualb` and flagged in `HE_Ualb_etc` (4,375 adults; limit 1 mg/L in 2021, 3 mg/L in 2022–24). Dropping them would have removed about a quarter of adults, nearly all without albuminuria. Filled with limit/√2, as NHANES does. 2 values above the upper limit set to the limit.
4. **Heart disease/stroke** items are not in the 2022 and 2023 files: `cvd_hx` set to the NHANES training mean for those 9,958 adults (pass-mark rule). No heart-failure item in any year.
5. **Step 1 v2 extras:** prediabetes and night urination are not asked in KNHANES (set to training mean); diabetes medicine = `DE1_31`/`DE1_32`; high cholesterol = `DI2_dg`; ever smoked = `BS1_1` = 5+ packs (100+ cigarettes).
Also: questionnaire codes 8/9 count as "no"; survey weight `wt_itvex` divided by 4 for the pooled years; complete case otherwise.

## Limits
- Korean, not Filipino. Lower prevalence (6.8% vs 12.0% in the NHANES test) and different case mix, which is why the risks run high.
- Single spot urine; KNHANES creatinine assay assumed comparable to NHANES (not checked).
- Two of four years lack the heart-disease items.

## Data rules
KNHANES raw files are used only for this non-commercial research and are not redistributed. They sit in `~/PJDSC2026/Kidney/data/knhanes/` (gitignored) and `/mnt/project-files/data_private/knhanes/`. Keep both out of any public repo or submission. Aggregate results (this file, `knhanes.json`) may be reported.
