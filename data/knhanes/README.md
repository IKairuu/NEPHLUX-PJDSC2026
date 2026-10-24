# KNHANES files (not included)

Step 2U and Step 1 v3 were learned and tested on the Korea National Health and Nutrition Examination Survey (KNHANES), published by the Korea Disease Control and Prevention Agency (KDCA).

**Why they are not here.** KDCA gives the raw files free to anyone who registers, but each user agrees not to pass them on to others. A copy in this repository, even a private or encrypted one, would break that agreement. So the files are **not** included, and `.gitignore` blocks them. Everything else is here: the code that reads them, the frozen hashes, the fitted model and every result, so anyone can get the same files from KDCA and check our numbers.

## Get the files

1. Go to https://knhanes.kdca.go.kr and open the raw data download page (원시자료 다운로드).
2. Register for a free account and accept the data-use agreement.
3. Download the SAS "all" file for each year below and put it in this folder.

| File | Years | Used for |
|---|---|---|
| `hn11_all.sas7bdat` to `hn14_all.sas7bdat` | 2011–2014 | Step 1 v3 learning data |
| `hn19_all.sas7bdat`, `hn20_all.sas7bdat` | 2019–2020 | Test set for Step 2U and Step 1 v3, scored once |
| `hn21_all.sas7bdat` to `hn24_all.sas7bdat` | 2021–2024 | Step 2U learning data; outside test of NHANES Step 2 |

## Re-run

From the repository root, with the packages in `analysis/requirements.txt`:

```bash
python -I analysis/knhanes_validate.py data/knhanes/hn21_all.sas7bdat data/knhanes/hn22_all.sas7bdat data/knhanes/hn23_all.sas7bdat data/knhanes/hn24_all.sas7bdat
python -I analysis/step2u.py fit data/knhanes/hn21_all.sas7bdat data/knhanes/hn22_all.sas7bdat data/knhanes/hn23_all.sas7bdat data/knhanes/hn24_all.sas7bdat
python -I analysis/step2u.py score data/knhanes/hn19_all.sas7bdat data/knhanes/hn20_all.sas7bdat
```

The outputs land in `results/` and should match the files already there (`knhanes.json`, `step2u_model.json`, `step2u_test.json`).
