"""Step 2U (Step 2 + YAKAP urinalysis), judged against PASS_MARK_STEP2U.md (written before this ran).

Usage (run from the repository root):
  python3 -I analysis/step2u.py fit   <hn21> <hn22> <hn23> <hn24>   -> results/step2u_fit.json, results/step2u_model.json
  python3 -I analysis/step2u.py score <hn19> <hn20>                 -> results/step2u_test.json   (run ONCE, with Step 1 v3)

Cohort, outcome and harmonisation come from analysis/knhanes_validate.py (frozen sha256 6c4c5133...); design(), the rule,
AUROC CI, calibration and matched referrals from analysis/run_all.py (copy of the main analysis file). KNHANES raw files are
private (KDCA terms) and are never copied into this folder.
"""
import json
import os
import sys

import numpy as np
import pandas as pd
from sklearn.experimental import enable_iterative_imputer  # noqa: F401
from sklearn.impute import IterativeImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_all as R0  # noqa: E402
import knhanes_validate as K  # noqa: E402

OUT = R0.OUT
DIP = ["pro_trace", "pro_1", "pro_2plus", "bld_pos", "glu_pos", "usg"]
NEED = ["bmi", "sbp", "dbp", "hba1c", "egfr", "tchol", "hdl", "hgb", "wbc", "plt"]
PRICE, PRICE_LO, PRICE_HI = 600, 300, 1200
BUDGETS = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400]  # uACR tests per 1,000 adults


def load_years(paths):
    parts = []
    for p in paths:
        raw = K.load(p)
        o, _ = K.harmonise(raw)
        o["upro"], o["ubld"], o["uglu"], o["usg_raw"] = raw.HE_Upro, raw.HE_Ubld, raw.HE_Uglu, raw.HE_Usg
        parts.append(o)
    return pd.concat(parts, ignore_index=True)


def base_cohort(d):
    """knhanes_validate cohort before the complete-case step, plus a dipstick protein result."""
    flow = [("all", len(d))]
    for nm, m in [("age 20+", d.age >= 20), ("not pregnant", d.pregnant == 0), ("has uACR", d.uacr.notna()),
                  ("answered DM/BP", ~d.questionnaire_missing), ("no known kidney disease", d.known_kidney == 0),
                  ("has dipstick protein", d.upro.notna())]:
        d = d[m.loc[d.index]]; flow.append((nm, len(d)))
    return d, flow


def add_dip(d):
    d = d.copy()
    d["pro_trace"] = (d.upro == 1).astype(float).where(d.upro.notna())
    d["pro_1"] = (d.upro == 2).astype(float).where(d.upro.notna())
    d["pro_2plus"] = (d.upro >= 3).astype(float).where(d.upro.notna())
    d["bld_pos"] = (d.ubld >= 2).astype(float).where(d.ubld.notna())
    d["glu_pos"] = (d.uglu >= 2).astype(float).where(d.uglu.notna())
    d["usg"] = d.usg_raw.clip(1.0, 1.04)
    return d


def X_of(d, with_dip):
    X = R0.design(d, 2)
    if with_dip:
        for c in DIP:
            X[c] = d[c].values
    return X


def fit_lr(X, y):
    sc = StandardScaler().fit(X)
    lr = LogisticRegression(C=1.0, max_iter=5000).fit(sc.transform(X), y)
    beta = lr.coef_[0] / sc.scale_
    return {"intercept": float(lr.intercept_[0] - np.sum(lr.coef_[0] * sc.mean_ / sc.scale_)),
            "coef": {c: float(b) for c, b in zip(X.columns, beta)},
            "mean": {c: float(v) for c, v in zip(X.columns, sc.mean_)}}


def prob(m, X):
    X = X.copy()
    for c in X.columns:
        X[c] = X[c].fillna(m["mean"][c])
    lp = m["intercept"] + sum(m["coef"][c] * X[c] for c in m["coef"])
    return (1 / (1 + np.exp(-lp))).values


def comparator(d):
    return ((R0.rule_baseline(d) == 1) | (d.upro >= 2)).astype(int).values


def train_fill(d, means):
    d = d.copy()
    d["cvd_hx"] = d.cvd_hx.fillna(means["cvd_hx"])
    return d


# ------------------------------------------------------------------ fit (2021-2024 only)
def fit(paths):
    d, flow = base_cohort(load_years(paths))
    d = add_dip(d)
    d = d[d[NEED + DIP].notna().all(axis=1)].reset_index(drop=True); flow.append(("complete case", len(d)))
    means = {"cvd_hx": float(d.cvd_hx.mean())}  # training mean where collected (2021, 2024)
    d = train_fill(d, means)
    y = d.albuminuria.values.astype(int)
    out = {"files": [os.path.basename(p) for p in paths], "flow": flow, "n": len(y), "cases": int(y.sum()),
           "cvd_hx_fill": means, "dev_loyo": {}, "learning_curve": {}}
    years = sorted(d.year_file.unique())
    for nm, wd in [("K2", False), ("step2u", True)]:
        X = X_of(d, wd)
        aucs = {}
        for yv in years:
            tr, te = d.year_file != yv, d.year_file == yv
            m = fit_lr(X[tr], y[tr])
            aucs[yv] = float(roc_auc_score(y[te], prob(m, X[te])))
        out["dev_loyo"][nm] = {"by_held_out_year": aucs, "mean": float(np.mean(list(aucs.values())))}
        # learning curve: learn from k of the other 3 years (all combinations), score the held-out year
        from itertools import combinations
        lc = {}
        for k in [1, 2, 3]:
            vals = []
            for yv in years:
                others = [z for z in years if z != yv]
                for comb in combinations(others, k):
                    tr = d.year_file.isin(comb)
                    vals.append(float(roc_auc_score(y[d.year_file == yv], prob(fit_lr(X[tr], y[tr]), X[d.year_file == yv]))))
            lc[k] = {"mean_auroc": float(np.mean(vals)), "n_fits": len(vals)}
        out["learning_curve"][nm] = lc
    models = {"K2": fit_lr(X_of(d, False), y), "step2u": fit_lr(X_of(d, True), y), "cvd_hx_fill": means,
              "trained_on": out["files"], "comparator": "rule_baseline OR dipstick protein code >= 2"}
    with open(os.path.join(OUT, "step2u_model.json"), "w") as fh:
        json.dump(models, fh, indent=1)
    with open(os.path.join(OUT, "step2u_fit.json"), "w") as fh:
        json.dump(out, fh, indent=1, default=str)
    print(json.dumps(out, indent=1, default=str))


# ------------------------------------------------------------------ score (2019-2020, ONCE)
def boot_diff_cases(p, comp, y, idx, share):
    bd = [int(((R0.top_share_flag(p[i], share) == 1) & (y[i] == 1)).sum()) - int(((comp[i] == 1) & (y[i] == 1)).sum()) for i in idx]
    return [float(np.percentile(bd, 2.5)), float(np.percentile(bd, 97.5))]


def budget_rows(p, comp, y, idx, rng):
    """Cases found per 1,000 adults when a fixed number of uACR tests is spent: model order vs comparator-first."""
    n = len(y)
    tie = rng.random(n)
    comp_order = np.lexsort((tie, -comp))  # comparator-flagged first, random within
    rows = []
    for b in BUDGETS:
        k = int(round(b / 1000 * n))
        def found(order_p, yy, kk):
            o = np.argsort(-order_p, kind="stable")[:kk]
            return yy[o].sum()
        fm = found(p, y, k)
        fc = y[comp_order[:k]].sum()
        diffs = []
        for i in idx:
            pi, ci, yi, ti = p[i], comp[i], y[i], tie[i]
            co = np.lexsort((ti, -ci))
            diffs.append((found(pi, yi, k) - yi[co[:k]].sum()) * 1000 / n)
        rows.append({"tests_per_1000": b, "model_cases_per_1000": float(fm * 1000 / n),
                     "comparator_cases_per_1000": float(fc * 1000 / n),
                     "extra_per_1000": float((fm - fc) * 1000 / n),
                     "extra_ci": [float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))],
                     "cost_per_case_model_php": float(b * PRICE / max(1e-9, fm * 1000 / n)),
                     "cost_per_case_comparator_php": float(b * PRICE / max(1e-9, fc * 1000 / n)),
                     "cost_per_case_model_range_php": [float(b * PRICE_LO / max(1e-9, fm * 1000 / n)),
                                                       float(b * PRICE_HI / max(1e-9, fm * 1000 / n))]})
    return rows


def score(paths):
    M = json.load(open(os.path.join(OUT, "step2u_model.json")))
    frozen = K.load_model()
    d0, flow = base_cohort(load_years(paths))
    d0 = add_dip(d0)
    d = d0[d0[NEED + DIP].notna().all(axis=1)].reset_index(drop=True); flow.append(("complete case", len(d)))
    d = train_fill(d, M["cvd_hx_fill"])
    y = d.albuminuria.values.astype(int)
    rng = np.random.default_rng(R0.SEED)
    idx = [rng.integers(0, len(y), len(y)) for _ in range(R0.N_BOOT)]
    pu, pk = prob(M["step2u"], X_of(d, True)), prob(M["K2"], X_of(d, False))
    pf = K.predict(frozen["step2"], R0.design(d, 2)).values
    comp, rule = comparator(d), R0.rule_baseline(d).values
    share = comp.mean()
    wt = d.wt.values / len(paths)
    out = {"files": [os.path.basename(p) for p in paths], "flow": flow, "n": len(y), "cases": int(y.sum()),
           "prevalence": float(y.mean()), "comparator_share": float(share), "auroc": {}, "matched": {}}
    for nm, p in [("step2u", pu), ("K2", pk), ("frozen_step2_nhanes", pf), ("comparator", comp.astype(float)),
                  ("rule", rule.astype(float))]:
        est, lo, hi = R0.auc_ci(y, p, idx)
        out["auroc"][nm] = {"auroc": est, "ci": [lo, hi], "weighted": float(roc_auc_score(y, p, sample_weight=wt))}
    diffs = [roc_auc_score(y[i], pu[i]) - roc_auc_score(y[i], pk[i]) for i in idx]
    out["auroc_step2u_minus_K2"] = {"diff": float(roc_auc_score(y, pu) - roc_auc_score(y, pk)),
                                    "ci": [float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))]}
    found_comp = int(((comp == 1) & (y == 1)).sum())
    out["matched"]["comparator"] = R0.referral_stats(y, comp)
    for nm, p in [("step2u", pu), ("K2", pk), ("frozen_step2_nhanes", pf)]:
        f = R0.top_share_flag(p, share)
        out["matched"][nm] = R0.referral_stats(y, f)
        out["matched"][nm]["extra_vs_comparator"] = int(((f == 1) & (y == 1)).sum()) - found_comp
        out["matched"][nm]["extra_ci"] = boot_diff_cases(p, comp, y, idx, share)
    rs = rule.mean()
    out["matched_plain_rule"] = {"rule_share": float(rs), "rule": R0.referral_stats(y, rule)}
    for nm, p in [("step2u", pu), ("frozen_step2_nhanes", pf)]:
        f = R0.top_share_flag(p, rs)
        out["matched_plain_rule"][nm] = {"found": int(((f == 1) & (y == 1)).sum()),
                                         "extra": int(((f == 1) & (y == 1)).sum()) - int(((rule == 1) & (y == 1)).sum()),
                                         "extra_ci": boot_diff_cases(p, rule, y, idx, rs)}
    out["calibration"] = {"step2u": R0.calib(y, pu), "K2": R0.calib(y, pk), "frozen_step2_nhanes": R0.calib(y, pf)}
    cu = out["calibration"]["step2u"]
    out["pass"] = {"C1": out["auroc"]["step2u"]["ci"][0] > 0.70,
                   "C2": out["matched"]["step2u"]["extra_ci"][0] > 0,
                   "C3": out["auroc_step2u_minus_K2"]["ci"][0] > 0,
                   "C4": (0.8 <= cu["slope"] <= 1.2) and (-0.2 <= cu["intercept_in_large"] <= 0.2)}
    out["pass"]["overall"] = bool(out["pass"]["C1"] and out["pass"]["C2"] and out["pass"]["C3"])
    # subgroups
    out["subgroups"] = {}
    for nm, g in [("female", d.female.values == 1), ("male", d.female.values == 0), ("age_20_44", d.age.values < 45),
                  ("age_45_64", (d.age.values >= 45) & (d.age.values < 65)), ("age_65plus", d.age.values >= 65),
                  ("no_dm_no_htn", rule == 0)]:
        gi = np.where(g)[0]
        sub_idx = [rng.integers(0, len(gi), len(gi)) for _ in range(300)]
        yg = y[gi]
        row = {"n": int(len(gi)), "cases": int(yg.sum())}
        for mn, p in [("step2u", pu[gi]), ("frozen_step2_nhanes", pf[gi]), ("comparator", comp[gi].astype(float))]:
            if 0 < yg.sum() < len(yg):
                est, lo, hi = R0.auc_ci(yg, p, sub_idx)
                row[mn] = {"auroc": est, "ci": [lo, hi]}
        row["comparator_sensitivity"] = float(((comp[gi] == 1) & (yg == 1)).sum() / max(1, yg.sum()))
        row["step2u_sensitivity_at_comparator_share"] = float(((R0.top_share_flag(pu, share)[gi] == 1) & (yg == 1)).sum() / max(1, yg.sum()))
        out["subgroups"][nm] = row
    out["budget_curve_step2u_vs_comparator"] = budget_rows(pu, comp, y, idx[:300], np.random.default_rng(R0.SEED + 1))
    out["budget_curve_frozen_step2_vs_rule"] = budget_rows(pf, rule, y, idx[:300], np.random.default_rng(R0.SEED + 2))
    # multiple imputation versus complete case (5 imputations, chained equations) on everyone with a dipstick result
    cols = NEED + DIP + ["cvd_hx"]
    dm = train_fill(d0.reset_index(drop=True), M["cvd_hx_fill"])
    ym = dm.albuminuria.values.astype(int)
    imp_cols = cols + ["age", "female", "dm_hx", "htn_hx", "bp_med", "smoker", "fam_dm"]
    mi = []
    for s in range(5):
        Z = IterativeImputer(sample_posterior=True, random_state=R0.SEED + s, max_iter=10).fit_transform(dm[imp_cols])
        di = dm.copy(); di[imp_cols] = Z
        for c in ["pro_trace", "pro_1", "pro_2plus", "bld_pos", "glu_pos"]:
            di[c] = di[c].round().clip(0, 1)
        di["upro"] = np.where(di.pro_2plus == 1, 3, np.where(di.pro_1 == 1, 2, np.where(di.pro_trace == 1, 1, 0)))
        pi = prob(M["step2u"], X_of(di, True)); ci = comparator(di)
        f = R0.top_share_flag(pi, ci.mean())
        mi.append({"auroc": float(roc_auc_score(ym, pi)),
                   "extra_vs_comparator": int(((f == 1) & (ym == 1)).sum()) - int(((ci == 1) & (ym == 1)).sum())})
    out["multiple_imputation"] = {"n": len(ym), "cases": int(ym.sum()), "rows_with_missing": int(dm[cols].isna().any(axis=1).sum()),
                                  "auroc_mean": float(np.mean([r["auroc"] for r in mi])),
                                  "extra_vs_comparator_mean": float(np.mean([r["extra_vs_comparator"] for r in mi])), "per_imputation": mi}
    with open(os.path.join(OUT, "step2u_test.json"), "w") as fh:
        json.dump(out, fh, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
    print(json.dumps({k: out[k] for k in ["flow", "n", "cases", "auroc", "auroc_step2u_minus_K2", "pass"]}, indent=1, default=str))


if __name__ == "__main__":
    {"fit": fit, "score": score}[sys.argv[1]](sys.argv[2:])
