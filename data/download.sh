#!/bin/sh
# Downloads the 60 raw NHANES XPT files used by analysis/run_all.py from the CDC.
# Verify with: shasum -a 256 -c ../SHA256SUMS.txt  (run inside data/raw)
set -e
cd "$(dirname "$0")/raw"
FILES="DEMO BIOPRO ALB_CR GHB GLU TCHOL HDL CBC BMX SMQ DIQ BPQ MCQ KIQ_U"
for pair in 2011:G 2013:H 2015:I; do
  y=${pair%%:*}; s=${pair##*:}
  for f in $FILES BPX; do
    curl -sfL -o "${f}_${s}.xpt" "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/${y}/DataFiles/${f}_${s}.xpt"
  done
done
for f in $FILES BPXO; do
  curl -sfL -o "P_${f}.xpt" "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/P_${f}.xpt"
done
echo "done: $(ls *.xpt | wc -l) files"
