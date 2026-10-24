# NEPHLUX model card

The app loads these JSON files. They hold coefficients and cut-offs only, with no survey rows.

| File | Model | Used when |
|---|---|---|
| `step2u_v1.json` | **Step 2U**: YAKAP labs, blood pressure, history and urine dipstick | The clinic has a dipstick result (the main model) |
| `nhanes_step1_step2_v1.json` | **Step 2**: YAKAP labs, blood pressure and history. **Step 1**: the 10-question resident check | Step 2: no dipstick result yet. Step 1: resident awareness check |
| `step2u_test_vectors.json` | 300 generated patients with the Python model's risk for each | Tests that the app gives the same score as Python |

## Step 2U

- **Outcome:** urine albumin-creatinine ratio (uACR) of 30 mg/g or more on a single spot urine.
- **Inputs:** age, sex, told of diabetes or high blood pressure, BP medicine, smoking, family history of diabetes, past heart attack, stroke or heart failure, BMI, mean systolic and diastolic BP, HbA1c, eGFR (race-free CKD-EPI 2021, with an extra term below 90), total and HDL cholesterol, hemoglobin, white cell count, platelets, and the dipstick: protein (trace, 1+, 2+ or more), blood, glucose and specific gravity.
- **Model:** L2-penalised logistic regression. Risk = 1 / (1 + e^−(intercept + Σ coef × value)). Each reason shown to the doctor is coef × (value − mean).
- **Learned on:** KNHANES 2021–2024, 20,465 Korean adults aged 20+ without known kidney disease (1,394 cases).
- **Tested once on:** KNHANES 2019–2020, 11,047 adults (912 cases, 8.3%), against a pass mark written first.

| Result | Value |
|---|---|
| AUROC | 0.917 (95% CI 0.909–0.926) |
| Cases found vs. "diabetes, high BP or dipstick protein 1+", same 39.4% referred | 846 vs. 752, **+94** (95% CI +72 to +118) |
| Sensitivity at that share | 92.8% vs. 82.5% |
| AUROC gain over the same model without the dipstick | +0.131 (0.116–0.147) |
| Calibration slope | 1.02 (0.96–1.07); mean predicted 8.5%, observed 8.3% |

**Cut-off:** refer at a risk of 2.55% or more. It was fixed on the learning years so that it refers the same share as the comparator rule. Dipstick protein 1+ or more always means refer.

## Step 2 (NHANES)

Same inputs without the dipstick. Trained on NHANES 2011–2016 (13,840 adults) and tested once on 2017–March 2020 (6,655 adults): AUROC 0.757 (0.737–0.775), +32 cases over "diabetes or high BP" (+12 to +51), calibration slope 0.95.

## Known limits

- **Not tested on Filipino patients.** Step 2U is Korean, Step 2 is American. Percentages need local recalibration before clinical use.
- **Lab-read dipsticks.** KNHANES strips were read by the survey's laboratory; strips read by eye at a YAKAP clinic may do worse.
- **Assumed dipstick codes.** Only the protein code was checked against the KDCA guidebook; the blood and glucose codes are assumed to follow it.
- **Weak fallback.** On the Korean test, Step 2 without a dipstick found fewer cases than "diabetes, high BP or dipstick 1+" (−54; −78 to −27), and over-predicted risk (slope 1.26 on 2021–2024).
- **Single spot urine.** Albuminuria is confirmed by repeat testing.
- **Resident check is awareness only.** Questions alone did not beat the rule. A version with a measured blood pressure and waist (Step 1 v3) passed its pass mark, but no role in the app takes those measurements yet, so it is not shipped.

Full numbers: `results/step2u_test.json`, `results/results.json`, `results/RESULT_STEP1_v3.md`.
