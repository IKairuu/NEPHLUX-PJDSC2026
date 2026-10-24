# TRIPOD+AI checklist (Collins et al., 2024) — where each item is reported

| Item | Topic | Where |
|---|---|---|
| 1 | Title: development + evaluation, prediction model, target population, outcome | Paper title and abstract |
| 2 | Abstract | Paper abstract |
| 3a–c | Background, rationale, existing models (MERWACS, rule) | Paper I, II |
| 4 | Objectives (develop + temporally validate) | Paper I.c |
| 5a–b | Data sources (NHANES 2011–2020), dates | Paper III.b, Table 1; data/download.sh |
| 6a–c | Setting, eligibility, treatments | Paper III.c; results/flow.csv |
| 7 | Data preparation (SAS-zero fix, clipping, unit handling) | analysis/run_all.py `xpt()`, `design()` |
| 8a–c | Outcome uACR ≥30 mg/g, measured blind to predictors (lab) | Paper III.c |
| 9a–c | Predictors, definitions, measurement (BP method change noted) | Paper III.d, Table 2 |
| 10 | Sample size: 13,840 train / 1,545 events; 6,655 test / 797 events | Paper V.a, Table 3 |
| 11 | Missing data: complete-case, counts reported | Paper III.c; results.json `missing_before_complete_case` |
| 12a–g | Analysis: LR (L2, C=1), HGB comparator, 5-fold CV for choice, thresholds from train only | Paper III.e–f; run_all.py |
| 12f | Performance: AUROC + 1,000 bootstrap CI, calibration slope/CITL, Brier, DCA | Paper III.f, V |
| 13 | Class imbalance: none applied | Paper III.e |
| 14 | Fairness: race/ethnicity, sex, age subgroups | Paper V.g; results.json `by_group` |
| 15 | Model output: probability + level + exact SHAP reasons | Paper IV; web/engine.js |
| 16 | Training vs evaluation differences (BP device) | Paper VI.b |
| 17 | Ethics: public de-identified data | Paper III.h |
| 18a–c | Open science: code, data access, pre-registration (PASS_MARK.md) | README; Paper IV.b |
| 19 | Patient/public involvement: none yet; usability plan | Paper VI.c |
| 20a–b | Participants, flow | Paper III.c, Table 3 |
| 21 | Model specification: all coefficients exported | web/model.js; results.json |
| 22 | Performance with CIs | Paper V, Tables 5–8 |
| 23 | Model updating: not done | Paper VI.d |
| 24–27 | Interpretation, limitations, usability, implications | Paper VI |
