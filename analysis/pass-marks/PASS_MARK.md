# Pre-registered pass mark — written BEFORE any model was trained

Date written: 2026-10-17 (before downloading data or fitting any model)

## Outcome
Albuminuria: urine albumin-to-creatinine ratio (uACR) >= 30 mg/g (NHANES ALB_CR, URDACT).

## Data split (fixed in advance)
- Train/develop: NHANES 2011–2012, 2013–2014, 2015–2016.
- Test (held out, touched once for final numbers): NHANES 2017–March 2020 pre-pandemic (P_ files).
- Adults aged 18+ with a valid uACR.

## Comparators on the TEST set
(a) Rule baseline "refer everyone with diabetes or high blood pressure"
    (self-reported diagnosed diabetes OR self-reported diagnosed hypertension OR on BP medicine
    OR measured BP >= 140/90 — the version a YAKAP clinic could apply).
(b) MERWACS (Yoo et al., 2026, PLOS Digital Health): reported AUROC ~0.70 (range ~0.68–0.73).
    We cannot run MERWACS's exact coefficients unless published; we compare against its
    reported AUROC and against our own no-lab step-1 model as a MERWACS-like proxy.

## Pass criteria (step 2 = YAKAP lab model)
1. AUROC on the 2017–2020 test set: lower bound of the bootstrap 95% CI > 0.70 (MERWACS).
2. At the SAME number of referrals as rule (a) (i.e., the threshold that refers the same
   share of the test population), the model finds MORE true uACR>=30 cases (higher
   sensitivity and PPV), with the bootstrap 95% CI of the difference in cases found excluding 0.
3. Calibration: calibration slope on test between 0.8 and 1.2 (reported regardless).

Step 1 (no-lab questionnaire) is judged on the same two comparisons and reported honestly;
it is not required to pass for step 2 to pass.

If a criterion fails, the paper says it failed. No re-specification after looking at the test set.
XGBoost is used only if it improves development-set (cross-validated) AUROC by >= 0.01 over
logistic regression; the choice is made on training cycles only.
