"""Resident check (step 1) version 2, judged against PASS_MARK_STEP1_v2.md (written before this ran).

Usage:  .venv/bin/python -I analysis/step1_v2.py
Reuses the cohort, design and helpers of analysis/run_all.py; adds only the pre-specified extra questions.
Outputs: results/step1_v2.json
"""
import json
import os
import sys

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_all as R0  # noqa: E402

rng = np.random.default_rng(R0.SEED)

EXTRA_FILES = {"DIQ": ["DIQ050", "DIQ070", "DIQ160"], "BPQ": ["BPQ080"], "SMQ": ["SMQ020"], "KIQ_U": ["KIQ480"]}


def extras(suffix):
    d = None
    for base, cols in EXTRA_FILES.items():
        x = R0.xpt(R0.fname(base, suffix))[["SEQN"] + cols]
        d = x if d is None else d.merge(x, on="SEQN", how="outer")
    o = pd.DataFrame({"SEQN": d.SEQN})
    o["dm_meds"] = ((d.DIQ050 == 1) | (d.DIQ070 == 1)).astype(int)
    o["prediabetes"] = (d.DIQ160 == 1).astype(int)
    o["chol_hx"] = (d.BPQ080 == 1).astype(int)
    o["ever_smoked"] = (d.SMQ020 == 1).astype(int)
    o["nocturia2"] = d.KIQ480.isin([2, 3, 4, 5]).astype(int)  # 2+ times a night; 7/9 -> no
    return o


def cohort():
    parts = []
    for label, suffix in R0.TRAIN_CYCLES + [R0.TEST_CYCLE]:
        d = R0.derive(R0.load_cycle(label, suffix)).merge(extras(suffix), on="SEQN", how="left")
        parts.append(d)
    d = pd.concat(parts, ignore_index=True)
    d["split"] = np.where(d.cycle == R0.TEST_CYCLE[0], "test", "train")
    d = d[(d.age >= 20) & (d.pregnant == 0) & d.uacr.notna() & ~d.questionnaire_missing & (d.known_kidney == 0)]
    need = ["bmi", "sbp", "dbp", "hba1c", "egfr", "tchol", "hdl", "hgb", "wbc", "plt"]
    d = d[d[need].notna().all(axis=1)].copy()
    for c in ["dm_meds", "prediabetes", "chol_hx", "ever_smoked", "nocturia2"]:
        d[c] = d[c].fillna(0).astype(int)
    return d


EXTRA_R = ["dm_meds", "prediabetes", "chol_hx", "ever_smoked", "nocturia2"]


def design_v2(df, variant):
    X = R0.design(df, 1)
    for c in EXTRA_R:
        X[c] = df[c]
    if variant == "bhw":
        X["sbp"] = df.sbp.clip(80, 220)
        X["dbp"] = df.dbp.clip(30, 130)
    return X


def main():
    d = cohort()
    tr, te = d[d.split == "train"], d[d.split == "test"]
    out = {"n": {"train": len(tr), "test": len(te), "test_cases": int(te.albuminuria.sum())},
           "note": "Test set was already used for step 1 v1; v2 scores are a second look at a used test set."}
    assert len(tr) == 13840 and len(te) == 6655, "cohort differs from run_all.py"
    ytr, yte = tr.albuminuria.values.astype(int), te.albuminuria.values.astype(int)
    rule = R0.rule_baseline(te).values
    share = rule.mean()
    idx = [rng.integers(0, len(yte), len(yte)) for _ in range(R0.N_BOOT)]
    cv = StratifiedKFold(5, shuffle=True, random_state=R0.SEED)
    rule_found = int(((rule == 1) & (yte == 1)).sum())
    out["rule_cases_found"] = rule_found
    out["rule_share"] = float(share)
    for nm, variant in [("v1_reference", None), ("v2_resident", "res"), ("v2_bhw", "bhw")]:
        Xtr = R0.design(tr, 1) if variant is None else design_v2(tr, variant)
        Xte = R0.design(te, 1) if variant is None else design_v2(te, variant)
        cvp = cross_val_predict(R0.fit_lr(Xtr, ytr), Xtr, ytr, cv=cv, method="predict_proba")[:, 1]
        m = R0.fit_lr(Xtr, ytr)
        ptr, p = m.predict_proba(Xtr)[:, 1], m.predict_proba(Xte)[:, 1]
        est, lo, hi = R0.auc_ci(yte, p, idx)
        f = R0.top_share_flag(p, share)
        found = int(((f == 1) & (yte == 1)).sum())
        bd = [int(((R0.top_share_flag(p[i], share) == 1) & (yte[i] == 1)).sum()) - int(((rule[i] == 1) & (yte[i] == 1)).sum()) for i in idx]
        t90 = float(np.quantile(ptr[ytr == 1], 0.10))
        go = p >= t90
        r = {"inputs": list(Xtr.columns), "dev_cv_auroc": float(roc_auc_score(ytr, cvp)),
             "test_auroc": est, "test_auroc_ci": [lo, hi],
             "test_auroc_weighted": float(roc_auc_score(yte, p, sample_weight=te.wt)),
             "cases_found_at_rule_share": found, "extra_vs_rule": found - rule_found,
             "extra_vs_rule_ci": [float(np.percentile(bd, 2.5)), float(np.percentile(bd, 97.5))],
             "go_threshold_train": t90, "sent_on_per100": float(100 * go.mean()),
             "sensitivity_sent_on": float((go & (yte == 1)).sum() / yte.sum()),
             "calibration": R0.calib(yte, p), "model": R0.lr_export(m, list(Xtr.columns))}
        if variant is not None:
            r["pass"] = {"c1_auroc_ci_lower_gt_0.70": lo > 0.70, "c2_more_cases_than_rule_ci_excludes_0": r["extra_vs_rule_ci"][0] > 0}
        out[nm] = r
    with open(os.path.join(R0.OUT, "step1_v2.json"), "w") as fh:
        json.dump(out, fh, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
    for k in ["v1_reference", "v2_resident", "v2_bhw"]:
        r = out[k]
        print(f"{k:13s} cv {r['dev_cv_auroc']:.3f}  test {r['test_auroc']:.3f} ({r['test_auroc_ci'][0]:.3f}-{r['test_auroc_ci'][1]:.3f})"
              f"  found {r['cases_found_at_rule_share']} vs rule {rule_found}  diff CI {r['extra_vs_rule_ci']}  pass {r.get('pass')}")


if __name__ == "__main__":
    sys.exit(main())
