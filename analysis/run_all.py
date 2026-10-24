"""Bago ang Dialysis - one script that regenerates every number in the paper.

Usage:  .venv/bin/python -I analysis/run_all.py
Inputs: raw NHANES XPT files in data/raw/ (see data/download.sh, SHA256SUMS.txt)
Outputs: results/*.json, results/*.csv, results/fig_*.png, web/model.js

Pre-registered pass mark: PASS_MARK.md (written before this script was run).
"""
import json
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, brier_score_loss
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
import statsmodels.api as sm

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "results")
WEB = os.path.join(ROOT, "web")
os.makedirs(OUT, exist_ok=True)
SEED = 20261017
N_BOOT = 1000
rng = np.random.default_rng(SEED)

TRAIN_CYCLES = [("2011-2012", "_G"), ("2013-2014", "_H"), ("2015-2016", "_I")]
TEST_CYCLE = ("2017-2020 pre-pandemic", "P_")


def xpt(name):
    d = pd.read_sas(os.path.join(RAW, name + ".xpt"))
    # SAS transport stores 0 as ~5.4e-79; round those to 0
    num = d.select_dtypes("number").columns
    d[num] = d[num].where((d[num].abs() > 1e-30) | d[num].isna(), 0.0)
    return d


def fname(base, suffix):
    return "P_" + base if suffix == "P_" else base + suffix


def load_cycle(label, suffix):
    f = lambda b: xpt(fname(b, suffix))
    d = f("DEMO")
    wcol = "WTMECPRP" if suffix == "P_" else "WTMEC2YR"
    d = d[["SEQN", "RIAGENDR", "RIDAGEYR", "RIDRETH3", "RIDEXPRG", wcol, "SDMVPSU", "SDMVSTRA"]].rename(columns={wcol: "wt"})
    for base, cols in [
        ("ALB_CR", ["URDACT", "URXUMA", "URXUCR"]),
        ("BIOPRO", ["LBXSCR"]),
        ("GHB", ["LBXGH"]),
        ("TCHOL", ["LBXTC"]),
        ("HDL", ["LBDHDD"]),
        ("CBC", ["LBXHGB", "LBXWBCSI", "LBXPLTSI"]),
        ("BMX", ["BMXBMI", "BMXWAIST"]),
        ("SMQ", ["SMQ020", "SMQ040"]),
        ("DIQ", ["DIQ010"]),
        ("BPQ", ["BPQ020", "BPQ050A"]),
        ("MCQ", ["MCQ300C", "MCQ160B", "MCQ160C", "MCQ160E", "MCQ160F"]),
        ("KIQ_U", ["KIQ022", "KIQ025"]),
        ("GLU", ["LBXGLU"]),
    ]:
        d = d.merge(f(base)[["SEQN"] + cols], on="SEQN", how="left")
    if suffix == "P_":
        bp = f("BPXO")
        sy, di = ["BPXOSY1", "BPXOSY2", "BPXOSY3"], ["BPXODI1", "BPXODI2", "BPXODI3"]
        bp_method = "oscillometric"
    else:
        bp = f("BPX")
        sy, di = ["BPXSY1", "BPXSY2", "BPXSY3"], ["BPXDI1", "BPXDI2", "BPXDI3"]
        bp_method = "auscultatory"
    bp = bp[["SEQN"] + sy + di].copy()
    bp[di] = bp[di].where(bp[di] > 0)  # diastolic 0 = unmeasurable
    bp["sbp"] = bp[sy].mean(axis=1)
    bp["dbp"] = bp[di].mean(axis=1)
    d = d.merge(bp[["SEQN", "sbp", "dbp"]], on="SEQN", how="left")
    d["cycle"] = label
    d["bp_method"] = bp_method
    return d


def egfr_ckdepi2021(scr, age, female):
    """Race-free CKD-EPI 2021 creatinine equation (Inker et al., 2021)."""
    k = np.where(female == 1, 0.7, 0.9)
    a = np.where(female == 1, -0.241, -0.302)
    r = scr / k
    return 142 * np.minimum(r, 1) ** a * np.maximum(r, 1) ** -1.200 * 0.9938 ** age * np.where(female == 1, 1.012, 1.0)


def derive(d):
    o = pd.DataFrame({"SEQN": d.SEQN, "cycle": d.cycle, "bp_method": d.bp_method, "wt": d.wt,
                      "psu": d.SDMVPSU, "strata": d.SDMVSTRA})
    o["age"] = d.RIDAGEYR
    o["female"] = (d.RIAGENDR == 2).astype(int)
    o["asian"] = (d.RIDRETH3 == 6).astype(int)
    o["race3"] = d.RIDRETH3
    o["pregnant"] = (d.RIDEXPRG == 1).astype(int)
    o["uacr"] = d.URDACT
    o["albuminuria"] = (d.URDACT >= 30).astype(float).where(d.URDACT.notna())
    # questionnaire: 1 = yes; 2 = no; 3 = borderline (DIQ010); 7/9 = refused/don't know -> treated as no
    o["dm_hx"] = (d.DIQ010 == 1).astype(int)
    o["htn_hx"] = (d.BPQ020 == 1).astype(int)
    o["bp_med"] = (d.BPQ050A == 1).astype(int)
    o["smoker"] = d.SMQ040.isin([1, 2]).astype(int)
    o["fam_dm"] = (d.MCQ300C == 1).astype(int)
    o["cvd_hx"] = ((d.MCQ160B == 1) | (d.MCQ160C == 1) | (d.MCQ160E == 1) | (d.MCQ160F == 1)).astype(int)
    o["known_kidney"] = ((d.KIQ022 == 1) | (d.KIQ025 == 1)).astype(int)
    o["questionnaire_missing"] = d.DIQ010.isna() | d.BPQ020.isna()
    o["bmi"] = d.BMXBMI
    o["waist"] = d.BMXWAIST
    o["sbp"] = d.sbp
    o["dbp"] = d.dbp
    o["hba1c"] = d.LBXGH
    o["creat"] = d.LBXSCR
    o["egfr"] = egfr_ckdepi2021(d.LBXSCR, d.RIDAGEYR, o.female)
    o["tchol"] = d.LBXTC
    o["hdl"] = d.LBDHDD
    o["hgb"] = d.LBXHGB
    o["wbc"] = d.LBXWBCSI
    o["plt"] = d.LBXPLTSI
    o["fbs"] = d.LBXGLU
    return o


# ------------------------------------------------------------------ features
STEP1 = ["age", "female", "dm_hx", "htn_hx", "bp_med", "bmi", "smoker", "fam_dm", "cvd_hx"]
STEP2_RAW = STEP1 + ["sbp", "dbp", "hba1c", "egfr", "tchol", "hdl", "hgb", "wbc", "plt"]
LABELS = {
    "age": "Age (years)", "age_sq": "Age squared", "female": "Female", "dm_hx": "Told has diabetes",
    "htn_hx": "Told has high blood pressure", "bp_med": "Takes BP medicine", "bmi": "Body-mass index",
    "smoker": "Current smoker", "fam_dm": "Parent/sibling with diabetes", "cvd_hx": "Past heart attack/stroke/heart failure",
    "sbp": "Systolic BP", "dbp": "Diastolic BP", "hba1c": "HbA1c", "egfr": "eGFR (creatinine)",
    "egfr_low": "eGFR below 90 (per 10 units)", "tchol": "Total cholesterol", "hdl": "HDL cholesterol",
    "hgb": "Hemoglobin", "wbc": "White cell count", "plt": "Platelets",
}


def design(df, step):
    """Model inputs. Kept simple so the same formula runs in the browser (web/model.js)."""
    X = pd.DataFrame(index=df.index)
    X["age"] = df.age
    X["age_sq"] = (df.age - 50) ** 2 / 100
    for c in ["female", "dm_hx", "htn_hx", "bp_med", "smoker", "fam_dm", "cvd_hx"]:
        X[c] = df[c]
    X["bmi"] = df.bmi.clip(15, 60)
    if step == 2:
        X["sbp"] = df.sbp.clip(80, 220)
        X["dbp"] = df.dbp.clip(30, 130)
        X["hba1c"] = df.hba1c.clip(4, 14)
        X["egfr"] = df.egfr.clip(5, 150)
        X["egfr_low"] = np.maximum(0, 90 - df.egfr.clip(5, 150)) / 10
        X["tchol"] = df.tchol.clip(80, 400)
        X["hdl"] = df.hdl.clip(15, 120)
        X["hgb"] = df.hgb.clip(6, 20)
        X["wbc"] = df.wbc.clip(1, 25)
        X["plt"] = df.plt.clip(20, 800)
    return X


def rule_baseline(df):
    """'Refer everyone with diabetes or high blood pressure' as a YAKAP clinic could apply it."""
    return ((df.dm_hx == 1) | (df.htn_hx == 1) | (df.bp_med == 1) | (df.sbp >= 140) | (df.dbp >= 90)).astype(int)


# ------------------------------------------------------------------ helpers
def boot_idx(n, b=N_BOOT):
    return [rng.integers(0, n, n) for _ in range(b)]


def auc_ci(y, p, idx):
    est = roc_auc_score(y, p)
    bs = [roc_auc_score(y[i], p[i]) for i in idx if 0 < y[i].sum() < len(i)]
    return est, np.percentile(bs, 2.5), np.percentile(bs, 97.5)


def calib(y, p):
    lp = np.log(p / (1 - p))
    m = sm.GLM(y, sm.add_constant(lp), family=sm.families.Binomial()).fit()
    citl = sm.GLM(y, np.ones_like(lp), family=sm.families.Binomial(), offset=lp).fit()
    return {"slope": float(m.params[1]), "slope_ci": [float(x) for x in m.conf_int()[1]],
            "intercept_in_large": float(citl.params[0]), "citl_ci": [float(x) for x in citl.conf_int()[0]],
            "mean_pred": float(p.mean()), "obs_rate": float(y.mean()), "brier": float(brier_score_loss(y, p))}


def top_share_flag(p, share):
    """Flag the top `share` of people by predicted risk (same number of referrals as a comparator)."""
    k = int(round(share * len(p)))
    order = np.argsort(-p, kind="stable")
    f = np.zeros(len(p), int)
    f[order[:k]] = 1
    return f


def referral_stats(y, flag):
    n = len(y)
    tp = int(((flag == 1) & (y == 1)).sum())
    return {"n": n, "referred": int(flag.sum()), "cases": int(y.sum()), "cases_found": tp,
            "sensitivity": tp / max(1, y.sum()), "ppv": tp / max(1, flag.sum()),
            "specificity": int(((flag == 0) & (y == 0)).sum()) / max(1, (y == 0).sum()),
            "referred_per_100": 100 * flag.sum() / n, "found_per_100": 100 * tp / n,
            "nnr": flag.sum() / max(1, tp)}


def net_benefit(y, p, ts):
    n = len(y)
    out = []
    for t in ts:
        f = p >= t
        tp = ((f) & (y == 1)).sum(); fp = ((f) & (y == 0)).sum()
        out.append(tp / n - fp / n * t / (1 - t))
    return np.array(out)


def fit_lr(X, y):
    m = make_pipeline(StandardScaler(), LogisticRegression(C=1.0, max_iter=5000))
    m.fit(X, y)
    return m


def lr_export(m, cols):
    sc, lr = m.named_steps["standardscaler"], m.named_steps["logisticregression"]
    beta = lr.coef_[0] / sc.scale_
    b0 = lr.intercept_[0] - np.sum(lr.coef_[0] * sc.mean_ / sc.scale_)
    return {"intercept": float(b0), "coef": {c: float(b) for c, b in zip(cols, beta)},
            "mean": {c: float(v) for c, v in zip(cols, sc.mean_)}}


def lr_contrib(exp, X):
    """Exact SHAP values for a linear-logit model with independent features: beta*(x - mean)."""
    return pd.DataFrame({c: exp["coef"][c] * (X[c] - exp["mean"][c]) for c in X.columns}, index=X.index)


# ------------------------------------------------------------------ run
def main():
    R = {"seed": SEED, "n_boot": N_BOOT}
    raw = pd.concat([derive(load_cycle(*c)) for c in TRAIN_CYCLES + [TEST_CYCLE]], ignore_index=True)
    raw["split"] = np.where(raw.cycle == TEST_CYCLE[0], "test", "train")

    # ---- flow (TRIPOD+AI item: participants)
    flow = []
    d = raw.copy()
    def step(name, mask):
        nonlocal d
        before = d.groupby("split").size()
        d = d[mask(d)]
        after = d.groupby("split").size()
        flow.append({"step": name, "train": int(after.get("train", 0)), "test": int(after.get("test", 0)),
                     "removed_train": int(before.get("train", 0) - after.get("train", 0)),
                     "removed_test": int(before.get("test", 0) - after.get("test", 0))})
    flow.append({"step": "All NHANES participants in DEMO", "train": int((d.split == "train").sum()), "test": int((d.split == "test").sum())})
    step("Age 20+", lambda x: x.age >= 20)
    step("Not pregnant", lambda x: x.pregnant == 0)
    step("Has urine albumin-creatinine ratio", lambda x: x.uacr.notna())
    step("Answered diabetes and BP questions", lambda x: ~x.questionnaire_missing)
    step("No known kidney disease or dialysis (hidden-damage target)", lambda x: x.known_kidney == 0)
    need = ["bmi", "sbp", "dbp", "hba1c", "egfr", "tchol", "hdl", "hgb", "wbc", "plt"]
    miss = {c: int(d[c].isna().sum()) for c in need}
    step("Complete BMI, BP and YAKAP labs (complete-case)", lambda x: x[need].notna().all(axis=1))
    R["flow"] = flow
    R["missing_before_complete_case"] = miss
    tr, te = d[d.split == "train"].copy(), d[d.split == "test"].copy()

    # ---- prevalence (survey-weighted; pooled train weights divided by number of cycles)
    def wprev(x, w):
        return float(np.sum(w * x) / np.sum(w))
    tr_w = tr.wt / len(TRAIN_CYCLES)
    R["prevalence"] = {
        "train_unweighted": float(tr.albuminuria.mean()), "train_weighted": wprev(tr.albuminuria, tr_w),
        "test_unweighted": float(te.albuminuria.mean()), "test_weighted": wprev(te.albuminuria, te.wt),
        "test_asian_unweighted": float(te[te.asian == 1].albuminuria.mean()),
        "test_asian_weighted": wprev(te[te.asian == 1].albuminuria, te[te.asian == 1].wt),
        "test_dm_or_htn_unweighted": float(te[rule_baseline(te) == 1].albuminuria.mean()),
        "test_neither_unweighted": float(te[rule_baseline(te) == 0].albuminuria.mean()),
        "test_neither_weighted": wprev(te[rule_baseline(te) == 0].albuminuria, te[rule_baseline(te) == 0].wt),
        "test_cases_without_dm_or_htn_share": float(((rule_baseline(te) == 0) & (te.albuminuria == 1)).sum() / te.albuminuria.sum()),
        "test_cases_with_egfr_ge60_share": float(((te.egfr >= 60) & (te.albuminuria == 1)).sum() / te.albuminuria.sum()),
    }
    # weighted share of albuminuria cases whose eGFR is >= 60 (i.e., creatinine alone looks normal)
    R["prevalence"]["test_cases_with_egfr_ge60_share_weighted"] = float(
        np.sum(te.wt * ((te.egfr >= 60) & (te.albuminuria == 1))) / np.sum(te.wt * te.albuminuria))
    R["n"] = {"train": len(tr), "test": len(te), "train_cases": int(tr.albuminuria.sum()), "test_cases": int(te.albuminuria.sum()),
              "test_asian": int(te.asian.sum()), "test_asian_cases": int(te[te.asian == 1].albuminuria.sum())}

    # ---- descriptive table
    desc = {}
    for nm, g in [("train", tr), ("test", te)]:
        desc[nm] = {"age_mean": float(g.age.mean()), "female_pct": 100 * float(g.female.mean()),
                    "asian_pct": 100 * float(g.asian.mean()), "dm_pct": 100 * float(g.dm_hx.mean()),
                    "htn_pct": 100 * float(g.htn_hx.mean()), "egfr_lt60_pct": 100 * float((g.egfr < 60).mean()),
                    "uacr_median": float(g.uacr.median()), "albuminuria_pct": 100 * float(g.albuminuria.mean()),
                    "sbp_mean": float(g.sbp.mean()), "hba1c_mean": float(g.hba1c.mean())}
    R["descriptives"] = desc

    ytr, yte = tr.albuminuria.values.astype(int), te.albuminuria.values.astype(int)
    X1tr, X1te = design(tr, 1), design(te, 1)
    X2tr, X2te = design(tr, 2), design(te, 2)

    # ---- development: 5-fold CV on training cycles only (model choice)
    cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
    cv_lr1 = cross_val_predict(fit_lr(X1tr, ytr), X1tr, ytr, cv=cv, method="predict_proba")[:, 1]
    cv_lr2 = cross_val_predict(fit_lr(X2tr, ytr), X2tr, ytr, cv=cv, method="predict_proba")[:, 1]
    gbt = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.05, max_leaf_nodes=15, min_samples_leaf=40,
                                         l2_regularization=1.0, random_state=SEED)
    cv_gbt2 = cross_val_predict(gbt, X2tr, ytr, cv=cv, method="predict_proba")[:, 1]
    R["dev_cv_auroc"] = {"step1_lr": roc_auc_score(ytr, cv_lr1), "step2_lr": roc_auc_score(ytr, cv_lr2),
                         "step2_gbt": roc_auc_score(ytr, cv_gbt2)}
    use_gbt = R["dev_cv_auroc"]["step2_gbt"] - R["dev_cv_auroc"]["step2_lr"] >= 0.01
    R["model_choice"] = "gradient-boosted trees" if use_gbt else "logistic regression (GBT gain < 0.01 in CV)"

    # ---- final fits on all training cycles
    m1, m2 = fit_lr(X1tr, ytr), fit_lr(X2tr, ytr)
    gbt.fit(X2tr, ytr)
    e1, e2 = lr_export(m1, list(X1tr.columns)), lr_export(m2, list(X2tr.columns))
    p1tr, p2tr = m1.predict_proba(X1tr)[:, 1], m2.predict_proba(X2tr)[:, 1]
    p1, p2, pg = m1.predict_proba(X1te)[:, 1], m2.predict_proba(X2te)[:, 1], gbt.predict_proba(X2te)[:, 1]
    rule = rule_baseline(te).values
    rule_tr = rule_baseline(tr).values

    # ---- test-set discrimination with bootstrap CIs
    idx = boot_idx(len(yte))
    R["test_auroc"] = {}
    for nm, p in [("step1_lr", p1), ("step2_lr", p2), ("step2_gbt", pg), ("rule_dm_or_htn", rule.astype(float)),
                  ("egfr_lt60_only", (te.egfr.values < 60).astype(float)), ("age_only", te.age.values.astype(float))]:
        est, lo, hi = auc_ci(yte, p, idx)
        R["test_auroc"][nm] = {"auroc": est, "ci": [lo, hi]}
    # paired bootstrap difference step2 - step1
    diffs = [roc_auc_score(yte[i], p2[i]) - roc_auc_score(yte[i], p1[i]) for i in idx]
    R["test_auroc"]["step2_minus_step1"] = {"diff": float(roc_auc_score(yte, p2) - roc_auc_score(yte, p1)),
                                            "ci": [float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))]}

    # ---- matched referrals vs rule (pass criterion 2)
    share = rule.mean()
    R["matched"] = {"rule_share_referred": float(share)}
    out = {"rule": referral_stats(yte, rule)}
    for nm, p in [("step1_lr", p1), ("step2_lr", p2), ("step2_gbt", pg)]:
        f = top_share_flag(p, share)
        out[nm] = referral_stats(yte, f)
        bd = []
        for i in idx:
            fi = top_share_flag(p[i], share)
            bd.append(int(((fi == 1) & (yte[i] == 1)).sum()) - int(((rule[i] == 1) & (yte[i] == 1)).sum()))
        out[nm]["extra_cases_vs_rule"] = out[nm]["cases_found"] - out["rule"]["cases_found"]
        out[nm]["extra_cases_ci"] = [float(np.percentile(bd, 2.5)), float(np.percentile(bd, 97.5))]
    R["matched"].update(out)

    # ---- calibration
    R["calibration"] = {"step1_lr": calib(yte, p1), "step2_lr": calib(yte, p2), "step2_gbt": calib(yte, pg)}

    # ---- pass/fail per PASS_MARK.md
    a2 = R["test_auroc"]["step2_lr"]
    R["pass_mark"] = {
        "c1_auroc_ci_lower_gt_0.70": a2["ci"][0] > 0.70,
        "c2_more_cases_than_rule_at_same_referrals": R["matched"]["step2_lr"]["extra_cases_ci"][0] > 0,
        "c3_calibration_slope_0.8_1.2": 0.8 <= R["calibration"]["step2_lr"]["slope"] <= 1.2,
        "step1_auroc_ci_lower_gt_0.70": R["test_auroc"]["step1_lr"]["ci"][0] > 0.70,
        "step1_more_cases_than_rule": R["matched"]["step1_lr"]["extra_cases_ci"][0] > 0,
    }
    R["pass_mark"]["step2_overall_pass"] = all([R["pass_mark"]["c1_auroc_ci_lower_gt_0.70"],
                                               R["pass_mark"]["c2_more_cases_than_rule_at_same_referrals"]])

    # ---- risk levels used by the app: thresholds fixed on TRAINING data only
    # high  = refer for urine albumin test: top share equal to rule's share in TRAIN
    # step-1 "go to YAKAP" = sensitivity >= 90% on train
    t2_high = float(np.quantile(p2tr, 1 - rule_tr.mean()))
    t2_mod = float(np.quantile(p2tr[ytr == 1], 0.10))   # 90% of train cases at or above
    t1_go = float(np.quantile(p1tr[ytr == 1], 0.10))
    R["thresholds"] = {"step2_high": t2_high, "step2_moderate": t2_mod, "step1_go_to_yakap": t1_go}

    # ---- two-step pathway per 100 residents (test set, thresholds from train)
    go = p1 >= t1_go
    ref = go & (p2 >= t2_high)
    path = {"residents": len(yte), "cases": int(yte.sum()),
            "step1_sent_to_yakap": int(go.sum()), "step1_cases_among_sent": int((go & (yte == 1)).sum()),
            "step2_referred_uacr": int(ref.sum()), "step2_cases_found": int((ref & (yte == 1)).sum())}
    n = len(yte)
    path["per100"] = {k: 100 * v / n for k, v in path.items() if k not in ("residents",)}
    path["step2_ppv"] = path["step2_cases_found"] / max(1, path["step2_referred_uacr"])
    path["overall_sensitivity"] = path["step2_cases_found"] / path["cases"]
    path["step1_sensitivity"] = path["step1_cases_among_sent"] / path["cases"]
    # clinic-only (everyone gets YAKAP labs) at fixed train threshold
    fh = (p2 >= t2_high).astype(int)
    path["clinic_only_fixed_threshold"] = referral_stats(yte, fh)
    path["rule_per100"] = referral_stats(yte, rule)
    R["pathway"] = path

    # ---- Asian subgroup
    a = te.asian.values == 1
    ia = boot_idx(a.sum())
    ya = yte[a]
    R["asian"] = {"n": int(a.sum()), "cases": int(ya.sum())}
    for nm, p in [("step1_lr", p1[a]), ("step2_lr", p2[a]), ("rule_dm_or_htn", rule[a].astype(float))]:
        est, lo, hi = auc_ci(ya, p, ia)
        R["asian"][nm] = {"auroc": est, "ci": [lo, hi]}
    sa = rule[a].mean()
    R["asian"]["matched_rule"] = referral_stats(ya, rule[a])
    R["asian"]["matched_step2"] = referral_stats(ya, top_share_flag(p2[a], sa))
    R["asian"]["calibration_step2"] = calib(ya, p2[a])
    R["asian"]["fixed_threshold_step2"] = referral_stats(ya, (p2[a] >= t2_high).astype(int))
    # other groups for fairness view
    R["by_group"] = {}
    for code, nm in [(1, "Mexican American"), (2, "Other Hispanic"), (3, "Non-Hispanic White"), (4, "Non-Hispanic Black"), (6, "Non-Hispanic Asian"), (7, "Other/multiracial")]:
        g = te.race3.values == code
        if yte[g].sum() >= 10:
            R["by_group"][nm] = {"n": int(g.sum()), "cases": int(yte[g].sum()), "auroc_step2": float(roc_auc_score(yte[g], p2[g])),
                                 "auroc_step1": float(roc_auc_score(yte[g], p1[g]))}
    for nm, g in [("female", te.female.values == 1), ("male", te.female.values == 0),
                  ("age_20_44", te.age.values < 45), ("age_45_64", (te.age.values >= 45) & (te.age.values < 65)), ("age_65plus", te.age.values >= 65),
                  ("no_dm_no_htn", rule == 0)]:
        R["by_group"][nm] = {"n": int(g.sum()), "cases": int(yte[g].sum()), "auroc_step2": float(roc_auc_score(yte[g], p2[g])),
                             "auroc_step1": float(roc_auc_score(yte[g], p1[g]))}

    # ---- weighted AUROC (sensitivity analysis)
    R["test_auroc_weighted"] = {"step1_lr": float(roc_auc_score(yte, p1, sample_weight=te.wt)),
                                "step2_lr": float(roc_auc_score(yte, p2, sample_weight=te.wt))}

    # ---- which YAKAP tests add value? (nested models, refit on train, scored on test)
    base = list(X1tr.columns)
    steps_abl = [("questionnaire only", base),
                 ("+ measured BP", base + ["sbp", "dbp"]),
                 ("+ HbA1c", base + ["sbp", "dbp", "hba1c"]),
                 ("+ creatinine (eGFR)", base + ["sbp", "dbp", "hba1c", "egfr", "egfr_low"]),
                 ("+ lipid profile", base + ["sbp", "dbp", "hba1c", "egfr", "egfr_low", "tchol", "hdl"]),
                 ("+ CBC (full step 2)", list(X2tr.columns))]
    R["ablation"] = []
    for nm, cols in steps_abl:
        mm = fit_lr(X2tr[cols], ytr)
        pp = mm.predict_proba(X2te[cols])[:, 1]
        est, lo, hi = auc_ci(yte, pp, idx[:300])
        R["ablation"].append({"model": nm, "auroc": est, "ci": [lo, hi],
                              "cases_found_at_rule_share": int(((top_share_flag(pp, share) == 1) & (yte == 1)).sum())})

    # ---- MERWACS-like comparison: no-lab step-1 model on MERWACS's composite outcome
    # (uACR >= 30 OR eGFR < 60; MERWACS uses an age/sex 2.5th-percentile eGFR cut-off instead of 60)
    ctr = ((tr.uacr >= 30) | (tr.egfr < 60)).astype(int).values
    cte = ((te.uacr >= 30) | (te.egfr < 60)).astype(int).values
    mc = fit_lr(X1tr, ctr)
    pc = mc.predict_proba(X1te)[:, 1]
    est, lo, hi = auc_ci(cte, pc, idx)
    R["composite_outcome_step1"] = {"auroc": est, "ci": [lo, hi], "prevalence_test": float(cte.mean()),
                                    "merwacs_reported_internal": [0.68, 0.70], "merwacs_reported_external_knhanes": [0.71, 0.73]}

    # ---- cost (PHP). Sources: PhilHealth Circular 2024-0023 (HD PHP 6,350/session, 156 sessions/yr);
    # PhilHealth Circular 2024-0013 Annex B (labs covered in YAKAP/Konsulta; urine albumin NOT listed).
    C = {"hd_per_session": 6350, "hd_sessions_per_year": 156,
         "uacr_test_price_assumed": 600, "uacr_price_range_assumed": [300, 1200]}
    C["hd_per_year"] = C["hd_per_session"] * C["hd_sessions_per_year"]
    per1000 = {}
    strategies = {"test_everyone_uacr": np.ones_like(yte), "rule_dm_or_htn": rule,
                  "step2_model_same_referrals": top_share_flag(p2, share),
                  "two_step_pathway_fixed_thresholds": (go_ := (p1 >= t1_go)) & (p2 >= t2_high)}
    for nm, f in strategies.items():
        f = np.asarray(f).astype(int)
        ref_ = 1000 * f.mean(); found = 1000 * ((f == 1) & (yte == 1)).mean()
        row = {"uacr_tests": ref_, "cases_found": found, "cases_missed": 1000 * yte.mean() - found}
        for lab, price in [("base", C["uacr_test_price_assumed"]), ("low", C["uacr_price_range_assumed"][0]), ("high", C["uacr_price_range_assumed"][1])]:
            row[f"cost_{lab}"] = ref_ * price
            row[f"cost_per_case_{lab}"] = ref_ * price / found
        # break-even: dialysis-years that must be avoided per 1,000 screened to repay the uACR tests
        row["breakeven_dialysis_years_base"] = ref_ * C["uacr_test_price_assumed"] / C["hd_per_year"]
        per1000[nm] = row
    C["per_1000_adults"] = per1000
    R["cost"] = C

    # ---- decision curve
    ts = np.round(np.arange(0.02, 0.51, 0.01), 2)
    dca = pd.DataFrame({"threshold": ts, "treat_all": net_benefit(yte, np.ones_like(p2), ts), "step1_lr": net_benefit(yte, p1, ts),
                        "step2_lr": net_benefit(yte, p2, ts), "rule_dm_or_htn": net_benefit(yte, rule.astype(float), ts)})
    dca["treat_none"] = 0.0
    dca.to_csv(os.path.join(OUT, "decision_curve.csv"), index=False)
    R["dca_selected"] = dca[dca.threshold.isin([0.05, 0.10, 0.15, 0.20, 0.30])].round(4).to_dict(orient="records")

    # ---- SHAP (exact for linear-logit) + check with shap package
    c2 = lr_contrib(e2, X2te)
    imp = c2.abs().mean().sort_values(ascending=False)
    R["shap_mean_abs_step2"] = {k: float(v) for k, v in imp.items()}
    c1 = lr_contrib(e1, X1te)
    R["shap_mean_abs_step1"] = {k: float(v) for k, v in c1.abs().mean().sort_values(ascending=False).items()}
    try:
        import shap
        ex = shap.LinearExplainer((np.array(list(e2["coef"].values())), e2["intercept"]),
                                  pd.DataFrame([e2["mean"]])[X2te.columns].values)
        sv = ex.shap_values(X2te.values)
        R["shap_package_check_max_abs_diff"] = float(np.max(np.abs(sv - c2.values)))
    except Exception as ex_:  # noqa
        R["shap_package_check_max_abs_diff"] = f"shap check failed: {ex_}"

    # ---- coefficients table (odds ratios per unit) and browser export
    R["coef_step1"] = e1
    R["coef_step2"] = e2
    model_js = {"version": "1.0.0", "trained_on": "NHANES 2011-2016 (adults 20+, no known kidney disease)",
                "tested_on": "NHANES 2017-March 2020 pre-pandemic", "outcome": "urine albumin-creatinine ratio >= 30 mg/g",
                "step1": e1, "step2": e2, "thresholds": R["thresholds"], "labels": LABELS,
                "test_auroc": {"step1": R["test_auroc"]["step1_lr"], "step2": R["test_auroc"]["step2_lr"]}}
    # test vectors so the JS port can be checked against Python
    tv = te.head(25)
    vec = pd.concat([tv[STEP2_RAW].reset_index(drop=True),
                     pd.DataFrame({"p1": p1[:25], "p2": p2[:25]})], axis=1)
    vec.to_json(os.path.join(WEB, "test_vectors.json"), orient="records", indent=1)

    # ---- figures
    fig, ax = plt.subplots(1, 2, figsize=(9, 3.8))
    for nm, p, c in [("Step 1 (no labs)", p1, "#888"), ("Step 2 (YAKAP labs)", p2, "#0b6e4f")]:
        q = pd.qcut(p, 10, labels=False, duplicates="drop")
        mp = pd.Series(p).groupby(q).mean(); ob = pd.Series(yte).groupby(q).mean()
        ax[0].plot(mp, ob, "o-", color=c, label=nm)
    ax[0].plot([0, 0.6], [0, 0.6], "k--", lw=0.8)
    ax[0].set_xlabel("Predicted risk (decile mean)"); ax[0].set_ylabel("Observed share uACR ≥30")
    ax[0].set_title("A. Calibration, test 2017–2020"); ax[0].legend(fontsize=8)
    ax[1].plot(dca.threshold, dca.step2_lr, color="#0b6e4f", label="Step 2 (YAKAP labs)")
    ax[1].plot(dca.threshold, dca.step1_lr, color="#888", label="Step 1 (no labs)")
    ax[1].plot(dca.threshold, dca.rule_dm_or_htn, color="#c0392b", ls="-.", label="Rule: DM or high BP")
    ax[1].plot(dca.threshold, dca.treat_all, color="k", ls=":", label="Refer all")
    ax[1].axhline(0, color="k", lw=0.6)
    ax[1].set_ylim(-0.02, max(0.02, dca[["step2_lr", "treat_all"]].max().max() * 1.15))
    ax[1].set_xlabel("Risk threshold for referral"); ax[1].set_ylabel("Net benefit")
    ax[1].set_title("B. Decision curve, test 2017–2020"); ax[1].legend(fontsize=7)
    plt.tight_layout(); plt.savefig(os.path.join(OUT, "fig_calibration_dca.png"), dpi=200); plt.close()

    fig, ax = plt.subplots(figsize=(5.0, 3.6))
    top = imp.head(10)[::-1]
    ax.barh([LABELS.get(k, k) for k in top.index], top.values, color="#0b6e4f")
    ax.set_xlabel("Mean |SHAP| (log-odds), test set"); ax.set_title("Step 2 reasons", fontsize=10)
    plt.tight_layout(); plt.savefig(os.path.join(OUT, "fig_shap.png"), dpi=200); plt.close()

    model_js["evidence"] = {
        "n": R["n"], "prevalence": R["prevalence"], "test_auroc": R["test_auroc"], "calibration_slope_step2": R["calibration"]["step2_lr"]["slope"],
        "matched": {k: {kk: R["matched"][k][kk] for kk in ("referred", "cases_found", "sensitivity", "ppv")} for k in ("rule", "step1_lr", "step2_lr")},
        "extra_cases_step2": [R["matched"]["step2_lr"]["extra_cases_vs_rule"]] + R["matched"]["step2_lr"]["extra_cases_ci"],
        "pathway_per100": R["pathway"]["per100"], "asian": {k: R["asian"][k] for k in ("n", "cases", "step1_lr", "step2_lr", "rule_dm_or_htn")},
        "ablation": R["ablation"], "cost_per_1000": R["cost"]["per_1000_adults"], "hd_per_year": R["cost"]["hd_per_year"],
        "pass_mark": R["pass_mark"], "composite_outcome_step1": R["composite_outcome_step1"]}
    with open(os.path.join(WEB, "model.js"), "w") as fh_:
        fh_.write("// AUTO-GENERATED by analysis/run_all.py - do not edit by hand\n")
        fh_.write("const BAGO_MODEL = " + json.dumps(model_js, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o)) + ";\n")
        fh_.write("if (typeof module !== 'undefined') module.exports = BAGO_MODEL;\n")
    pd.DataFrame(flow).to_csv(os.path.join(OUT, "flow.csv"), index=False)
    with open(os.path.join(OUT, "results.json"), "w") as fh_:
        json.dump(R, fh_, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
    print(json.dumps({k: R[k] for k in ["n", "prevalence", "dev_cv_auroc", "model_choice", "test_auroc", "matched", "calibration", "pass_mark", "thresholds", "pathway", "asian"]},
                     indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o)))


if __name__ == "__main__":
    sys.exit(main())
