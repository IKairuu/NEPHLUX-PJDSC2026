# Analysis

The Python scripts that build, test and export every model in NEPHLUX. Each pass mark in `pass-marks/` was written before the data it judges were opened.

## Scripts

| Script | What it does | Data |
|---|---|---|
| `run_all.py` | Step 1 and Step 2 on NHANES: cohort, training, the one test, calibration, decision curves, SHAP reasons, cost per case. Writes `results/results.json` and the figures | `data/raw/` (in repo) |
| `knhanes_validate.py` | Runs the frozen NHANES models once on Korean adults (KNHANES 2021–2024) | `data/knhanes/` (not in repo) |
| `step2u.py` | Step 2U: fits Step 2 plus the urine dipstick on KNHANES 2021–2024, then scores it once on 2019–2020 | `data/knhanes/` |
| `step1_v3.py` | Step 1 v3: resident check with and without a measured blood pressure and waist | `data/knhanes/` |
| `step1_v2.py`, `budget_curve.py`, `make_cdo_geo.py`, `make_fig_pathway.py` | Earlier Step 1 version, the test-budget curve, the city map data and the pathway figure | |

## Run

```bash
python -m venv .venv
.venv/bin/pip install -r analysis/requirements.txt
.venv/bin/python -I analysis/run_all.py
```

`run_all.py` needs only the NHANES files already in `data/raw/`. The KNHANES scripts need the files described in [`data/knhanes/README.md`](../data/knhanes/README.md). Seeds are fixed, so the outputs match the files in `results/`.

## Frozen hashes

Before each one-time test run, the scripts, pass marks and fitted model were hashed with SHA-256 (`*.FROZEN.sha256`). `run_all.py` and `knhanes_validate.py` match their recorded hashes exactly:

```bash
shasum -a 256 analysis/run_all.py analysis/knhanes_validate.py
```

`step2u.py`, `step1_v3.py`, `pass-marks/PASS_MARK_STEP2U.md` and `pass-marks/PASS_MARK_STEP1_v3.md` were edited once after the test, only in comments. A team member's name was replaced with neutral wording to keep the entry anonymous, and a usage line was updated to the repository layout. No code, number or criterion changed, so their hashes no longer match the recorded ones. The test results in `results/` come from the frozen versions.

`step1_v3.py` saves its fitted trees as a pickle file, which is not included because pickles can run code when loaded. Re-running `fit` recreates it.
