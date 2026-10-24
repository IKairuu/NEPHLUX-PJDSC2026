# Data

Every dataset NEPHLUX uses, where it came from, and whether it is in this repository.

| Folder | Dataset | Source | In repo? |
|---|---|---|---|
| `raw/` | NHANES 2011–2016 and 2017–March 2020: 60 XPT files (demographics, urine albumin and creatinine, blood tests, blood pressure, body measures, questionnaires) | U.S. CDC, National Center for Health Statistics | **Yes.** U.S. government public data |
| `geo/cdo_yakap_clinics_located.csv` | The 42 PhilHealth YAKAP clinics in Cagayan de Oro City, with barangay and approximate map point | PhilHealth list of YAKAP accredited providers as of 30 September 2026 | **Yes** |
| `geo/yakap_clinics_ph_2026-09-30.csv` | The full national YAKAP provider list (4,138 facilities), parsed from the PhilHealth list | PhilHealth | **Yes** |
| `geo/cdo_barangay_population_2015_2020_2024.csv` | Population of all 80 Cagayan de Oro barangays | Philippine Statistics Authority census, via the `psgc` R package | **Yes** |
| `geo/cdo_barangays_psgc2023_hires.geojson` | Barangay boundaries (PSGC 2023) | faeldon/philippines-json-maps (MIT licence) | **Yes** |
| `knhanes/` | KNHANES 2011–2014 and 2019–2024 | Korea Disease Control and Prevention Agency | **No.** KDCA's terms forbid redistribution; see [`knhanes/README.md`](knhanes/README.md) |

## Check the NHANES files

The files match the checksums recorded when they were first downloaded:

```bash
cd data/raw
shasum -a 256 -c ../SHA256SUMS.txt
```

`download.sh` fetches the same 60 files fresh from the CDC.

## Cohorts built from these files

`analysis/run_all.py` builds the NHANES cohorts from `raw/`: adults 20+, not pregnant, no known kidney disease or dialysis, complete case. That gives 13,840 adults for training (2011–2016) and 6,655 for the test (2017–March 2020). The step-by-step counts are in `results/flow.csv`.

The clinic and barangay files feed the City Health Office map and the per-1,000 rates. The app's database is seeded from the same lists (`backend/prisma/seed-data/`).
