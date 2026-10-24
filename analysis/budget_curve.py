"""Budget curve for the City Health Office slider: with N urine albumin tests per 1,000 adults, how many
uACR >= 30 cases does each way of choosing who gets tested find? (NHANES 2017-March 2020 test set,
same frozen step-2 model as analysis/run_all.py; no refitting, no new choices.)

Usage:  .venv/bin/python -I analysis/budget_curve.py
Outputs: results/budget_curve.csv, results/budget_curve.json (read by prototype/build_v3.py)

Orderings compared at each N:
  model  - test the N highest step-2 risks first
  rule   - test people with diabetes or high BP first, in random order (expected value), then everyone else
  random - test N people in random order (expected value) = N x prevalence
Point estimates only; the CI for the matched comparison (+32, 95% CI +12 to +51) is in results.json.
"""
import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_all as R0  # noqa: E402
from step1_v2 import cohort  # noqa: E402


def main():
    d = cohort()
    tr, te = d[d.split == "train"], d[d.split == "test"]
    ytr, yte = tr.albuminuria.values.astype(int), te.albuminuria.values.astype(int)
    m2 = R0.fit_lr(R0.design(tr, 2), ytr)
    p2 = m2.predict_proba(R0.design(te, 2))[:, 1]
    rule = R0.rule_baseline(te).values
    n, prev = len(yte), yte.mean()
    cum = np.concatenate([[0], np.cumsum(yte[np.argsort(-p2, kind="stable")])])
    ppv_rule, n_rule = yte[rule == 1].mean(), (rule == 1).sum()
    ppv_rest = yte[rule == 0].mean()
    rows = []
    for per1000 in range(0, 1001, 10):
        k = int(round(per1000 / 1000 * n))
        model = cum[k]
        rule_found = k * ppv_rule if k <= n_rule else n_rule * ppv_rule + (k - n_rule) * ppv_rest
        rows.append({"tests_per_1000": per1000, "model": 1000 * model / n, "rule_first": 1000 * rule_found / n,
                     "random": per1000 * prev})
    df = pd.DataFrame(rows).round(2)
    df.to_csv(os.path.join(R0.OUT, "budget_curve.csv"), index=False)
    meta = {"source": "NHANES 2017-March 2020 test set (n=%d, %d cases); frozen step-2 model" % (n, yte.sum()),
            "cases_per_1000": float(1000 * prev), "rule_share_per_1000": float(1000 * n_rule / n),
            "uacr_price_assumed": 600, "uacr_price_range_assumed": [300, 1200], "rows": df.to_dict(orient="records")}
    with open(os.path.join(R0.OUT, "budget_curve.json"), "w") as fh:
        json.dump(meta, fh, indent=1)
    at = df.set_index("tests_per_1000")
    print(at.loc[[100, 200, 300, 490, 700, 1000]])


if __name__ == "__main__":
    sys.exit(main())
