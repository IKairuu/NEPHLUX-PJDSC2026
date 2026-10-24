# Pass mark for the KNHANES external test — written BEFORE any KNHANES data is downloaded

Date written: 2026-10-23. No KNHANES file has been requested, downloaded or opened.

## Purpose
Test the **frozen** NHANES-trained models once on Korean adults (KNHANES, Korea Disease Control and
Prevention Agency), the first test outside the United States and the first on an Asian national sample.
KNHANES is **not** added to training. It is a test set only.

## Data
- KNHANES survey years that measured urine albumin and urine creatinine (to be confirmed from the
  KNHANES codebook before download; only those years are requested). The years are listed in
  `analysis/knhanes_validate.py` before the files are opened.
- Same cohort rules as `PASS_MARK.md`/`run_all.py`: adults 20+, not pregnant, has uACR, answered the
  diabetes and BP questions, no known kidney disease or dialysis, complete BMI, BP and labs.
- Outcome: uACR ≥ 30 mg/g from a single spot urine.
- Survey weights used for the weighted AUROC (secondary).

## Models tested (unchanged coefficients and thresholds from `web/model.js` v1.0.0)
- Step 2 (YAKAP labs + BP + history) — the main test.
- Step 1 v1 and step 1 v2 (resident, resident + BHW BP) — secondary.
- Comparator: rule "diabetes or high BP" defined exactly as in `run_all.py`.

## Harmonisation rules (fixed now)
- eGFR: race-free CKD-EPI 2021 from serum creatinine (mg/dL), same function as `run_all.py`.
- BP: mean of the available readings, as in NHANES.
- Units converted to NHANES units (creatinine mg/dL, cholesterol mg/dL, haemoglobin g/dL, WBC and
  platelets ×10⁹/L, HbA1c %).
- A predictor KNHANES does not collect is set to the NHANES training mean (its contribution becomes 0)
  and this is listed as a deviation. No other imputation; complete-case otherwise.

## Pass criteria for step 2 (same as `PASS_MARK.md`)
1. AUROC lower bound of the bootstrap 95% CI > 0.70.
2. At the rule's referral share, more cases found than the rule, bootstrap 95% CI of the difference excluding 0.
3. Calibration slope between 0.8 and 1.2 (reported regardless). If calibration-in-the-large is off, a
   recalibrated version (intercept and slope refitted on a random half, checked on the other half) is
   reported **separately**, never in place of the frozen result.

Seed 20261017, 1,000 bootstrap draws. Run once. Failures are reported as failures.
