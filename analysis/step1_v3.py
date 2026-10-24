"""Resident check (Step 1) version 3, judged against PASS_MARK_STEP1_v3.md (written before this ran).

Usage:
  python -I analysis/step1_v3.py fit   <hn11> <hn12> <hn13> <hn14> <hn21> <hn22> <hn23> <hn24>
      -> results/step1_v3_cv.json (all 15 candidates per variant), results/step1_v3_model.json (frozen winners)
  python -I analysis/step1_v3.py score <hn19> <hn20>          (run ONCE, together with Step 2U)
      -> results/step1_v3_test.json

KNHANES raw files are not redistributed (KDCA terms). Cohort, outcome and the rule follow
dev/knhanes_v1/analysis/knhanes_validate.py and run_all.py; the helpers are re-written here because run_all.py
lives only on the team's own machine.
"""
import hashlib
import json
import os
import pickle
import sys

import numpy as np
import pandas as pd
import pyreadstat
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "results")
SEED, N_BOOT = 20261017, 1000
TRAIN_YEARS = ["hn11", "hn12", "hn13", "hn14", "hn21", "hn22", "hn23", "hn24"]
TEST_YEARS = ["hn19", "hn20"]

COLS = ["age", "sex", "wt_itvex", "HE_prg", "DN1_dg", "HE_Ualb", "HE_Ualb_etc", "HE_Ucrea", "HE_UCREA",
        "DE1_dg", "DE1_31", "DE1_32", "DE1_ag", "DI1_dg", "DI1_2", "DI1_ag", "DI2_dg", "DI3_dg", "DI5_dg", "DI6_dg",
        "BS3_1", "BS1_1", "HE_DMfh1", "HE_DMfh2", "HE_DMfh3", "HE_HPfh1", "HE_HPfh2", "HE_HPfh3",
        "HE_BMI", "HE_wc", "HE_sbp1", "HE_sbp2", "HE_sbp3", "HE_dbp1", "HE_dbp2", "HE_dbp3", "BD1_11", "D_1_1",
        "HE_HbA1c", "HE_crea", "HE_chol", "HE_HDL_st2", "HE_HB", "HE_WBC", "HE_Bplt"]

RES = ["age", "age_sq", "female", "dm_hx", "dm_insulin", "dm_pills", "dm_dur", "htn_any", "bp_med", "htn_dur",
       "chol_hx", "cvd_hx", "smoker", "ex_smoker", "fam_dm", "fam_htn", "bmi", "alcohol", "srh"]
BHW = RES + ["sbp", "dbp", "waist"]
INTERACTIONS = [("age", "dm_hx"), ("age", "htn_any"), ("dm_hx", "htn_any"), ("age", "female"), ("bmi", "dm_hx")]


# ---------- data ----------
def egfr_ckdepi2021(scr, age, female):
    k = np.where(female == 1, 0.7, 0.9)
    a = np.where(female == 1, -0.241, -0.302)
    r = scr / k
    return 142 * np.minimum(r, 1) ** a * np.maximum(r, 1) ** -1.2 * 0.9938 ** age * np.where(female == 1, 1.012, 1)


def load(path):
    _, meta = pyreadstat.read_sas7bdat(path, metadataonly=True)
    use = [c for c in COLS if c in meta.column_names]
    raw, _ = pyreadstat.read_sas7bdat(path, usecols=use)
    for c in COLS:
        if c not in raw.columns:
            raw[c] = np.nan
    raw["year"] = os.path.basename(path)[:4]
    raw["cvd_collected"] = all(c in meta.column_names for c in ["DI3_dg", "DI5_dg", "DI6_dg"])
    return raw


def yes(s):
    return (s == 1).astype(int)


def dur(age, ag, has):
    # diagnosis age codes 888 = not applicable, 999 = don't know
    d = (age - ag).where((ag < 150) & (has == 1))
    return d.clip(0, 40).fillna(0)


def harmonise(raw):
    o = pd.DataFrame(index=raw.index)
    o["year"] = raw.year
    o["age"] = raw.age
    o["age_sq"] = (raw.age - 50) ** 2 / 100
    o["female"] = (raw.sex == 2).astype(int)
    o["wt"] = raw.wt_itvex
    o["pregnant"] = yes(raw.HE_prg)
    o["known_kidney"] = yes(raw.DN1_dg)
    alb = raw.HE_Ualb.copy()
    flag = raw.HE_Ualb_etc.map(lambda b: b.decode("ascii", "replace") if isinstance(b, bytes) else (b if isinstance(b, str) else ""))
    flag = flag.fillna("").str.strip()
    lim = pd.to_numeric(flag.str.lstrip("<>"), errors="coerce")
    below, above = alb.isna() & flag.str.startswith("<"), alb.isna() & flag.str.startswith(">")
    alb[below] = lim[below] / np.sqrt(2)
    alb[above] = lim[above]
    ucr = raw.HE_Ucrea.where(raw.HE_Ucrea.notna(), raw.HE_UCREA)
    o["uacr"] = alb / ucr * 100
    o["albuminuria"] = (o.uacr >= 30).astype(float).where(o.uacr.notna())
    o["questionnaire_missing"] = raw.DE1_dg.isna() | raw.DI1_dg.isna()
    o["dm_hx"] = yes(raw.DE1_dg)
    o["dm_insulin"] = yes(raw.DE1_31)
    o["dm_pills"] = yes(raw.DE1_32)
    o["dm_dur"] = dur(raw.age, raw.DE1_ag, raw.DE1_dg)
    o["htn_told"] = yes(raw.DI1_dg)
    o["bp_med"] = raw.DI1_2.isin([1, 2, 3, 4]).astype(int)
    o["htn_any"] = ((o.htn_told == 1) | (o.bp_med == 1)).astype(int)
    o["htn_dur"] = dur(raw.age, raw.DI1_ag, o.htn_any)
    o["chol_hx"] = yes(raw.DI2_dg)
    cvd = raw[["DI3_dg", "DI5_dg", "DI6_dg"]]
    o["cvd_hx"] = (cvd == 1).any(axis=1).astype(float).where(raw.cvd_collected)
    o["smoker"] = raw.BS3_1.isin([1, 2]).astype(int)
    o["ex_smoker"] = ((raw.BS3_1 == 3) & raw.BS1_1.isin([1, 2])).astype(int)
    o["fam_dm"] = (raw[["HE_DMfh1", "HE_DMfh2", "HE_DMfh3"]] == 1).any(axis=1).astype(int)
    o["fam_htn"] = (raw[["HE_HPfh1", "HE_HPfh2", "HE_HPfh3"]] == 1).any(axis=1).astype(int)
    o["bmi"] = raw.HE_BMI.clip(15, 60)
    # BD1_11: 1 none in past year .. 6 four+ a week; 8 never drank; 9 don't know
    o["alcohol"] = raw.BD1_11.map({1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 0}).fillna(0)
    o["srh"] = raw.D_1_1.where(raw.D_1_1.isin([1, 2, 3, 4, 5]), 3)
    o["sbp"] = raw[["HE_sbp1", "HE_sbp2", "HE_sbp3"]].mean(axis=1)
    o["dbp"] = raw[["HE_dbp1", "HE_dbp2", "HE_dbp3"]].where(raw[["HE_dbp1", "HE_dbp2", "HE_dbp3"]] > 0).mean(axis=1)
    o["waist"] = raw.HE_wc
    o["egfr"] = egfr_ckdepi2021(raw.HE_crea, raw.age, o.female)
    for k, c in [("hba1c", "HE_HbA1c"), ("tchol", "HE_chol"), ("hdl", "HE_HDL_st2"), ("hgb", "HE_HB"),
                 ("wbc", "HE_WBC"), ("plt", "HE_Bplt")]:
        o[k] = raw[c]
    return o


def cohort(paths):
    d = pd.concat([harmonise(load(p)) for p in paths], ignore_index=True)
    flow = [("all", len(d))]
    for nm, m in [("age 20+", d.age >= 20), ("not pregnant", d.pregnant == 0), ("has uACR", d.uacr.notna()),
                  ("answered DM/BP", ~d.questionnaire_missing), ("no known kidney disease", d.known_kidney == 0)]:
        d = d[m.loc[d.index]]
        flow.append((nm, len(d)))
    need = ["bmi", "sbp", "dbp", "hba1c", "egfr", "tchol", "hdl", "hgb", "wbc", "plt"]
    d = d[d[need].notna().all(axis=1)].reset_index(drop=True)
    flow.append(("complete case", len(d)))
    return d, flow


def rule_baseline(d):
    """Frozen run_all.rule_baseline(): told DM OR told high BP OR BP medicine OR SBP>=140 OR DBP>=90."""
    return ((d.dm_hx == 1) | (d.htn_told == 1) | (d.bp_med == 1) | (d.sbp >= 140) | (d.dbp >= 90)).astype(int)


def rule_questions_only(d):
    return ((d.dm_hx == 1) | (d.htn_told == 1) | (d.bp_med == 1)).astype(int)


def top_share_flag(p, share):
    """Refer the top `share` of people by score (ties broken by order, so the count matches exactly)."""
    n = int(round(share * len(p)))
    f = np.zeros(len(p), dtype=int)
    f[np.argsort(-p, kind="stable")[:n]] = 1
    return f


# ---------- models ----------
def matrix(d, feats, fill):
    X = d[feats].astype(float).copy()
    for c in feats:
        X[c] = X[c].fillna(fill[c])
    return X


def add_inter(X):
    X = X.copy()
    for a, b in INTERACTIONS:
        X[f"{a}_x_{b}"] = X[a] * X[b]
    return X


def candidates():
    out = []
    for C in (0.01, 0.1, 1.0):
        out.append({"id": f"A_lr_C{C}", "kind": "lr", "C": C, "inter": False})
    for C in (0.01, 0.1, 1.0):
        out.append({"id": f"B_lrint_C{C}", "kind": "lr", "C": C, "inter": True})
    for nl in (4, 8, 16):
        for nt in (200, 400, 800):
            out.append({"id": f"C_gbm_l{nl}_t{nt}", "kind": "gbm", "num_leaves": nl, "n_estimators": nt})
    return out


class Fitted:
    def __init__(self, cand, feats, fill, scaler, model):
        self.cand, self.feats, self.fill, self.scaler, self.model = cand, feats, fill, scaler, model

    def predict(self, d):
        X = matrix(d, self.feats, self.fill)
        if self.cand["kind"] == "lr":
            if self.cand["inter"]:
                X = add_inter(X)
            return self.model.predict_proba(self.scaler.transform(X.values))[:, 1]
        return self.model.predict_proba(X.values)[:, 1]


def fit(cand, d, feats):
    fill = {c: float(d[c].median()) if c == "waist" else float(d[c].mean()) for c in feats}
    X = matrix(d, feats, fill)
    y = d.albuminuria.values.astype(int)
    if cand["kind"] == "lr":
        if cand["inter"]:
            X = add_inter(X)
        sc = StandardScaler().fit(X.values)
        m = LogisticRegression(C=cand["C"], max_iter=5000).fit(sc.transform(X.values), y)
        return Fitted(cand, feats, fill, sc, m)
    import lightgbm as lgb
    m = lgb.LGBMClassifier(num_leaves=cand["num_leaves"], n_estimators=cand["n_estimators"], learning_rate=0.03,
                           min_child_samples=100, subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
                           reg_lambda=1.0, random_state=SEED, verbose=-1, n_jobs=4)
    m.fit(X.values, y)
    return Fitted(cand, feats, fill, None, m)


def logit(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def calib(y, p):
    """Calibration slope and calibration-in-the-large (intercept with logit(p) as offset)."""
    import statsmodels.api as sm
    lp = logit(p)
    slope = sm.GLM(y, sm.add_constant(lp), family=sm.families.Binomial()).fit().params[1]
    citl = sm.GLM(y, np.ones((len(y), 1)), family=sm.families.Binomial(), offset=lp).fit().params[0]
    return float(slope), float(citl)


# ---------- fit mode ----------
def run_fit(paths):
    d, flow = cohort(paths)
    years = sorted(d.year.unique())
    assert years == TRAIN_YEARS, f"fit must use exactly the learning years, got {years}"
    out = {"flow": flow, "n": len(d), "cases": int(d.albuminuria.sum()),
           "by_year": {y: {"n": int((d.year == y).sum()), "cases": int(d.albuminuria[d.year == y].sum())} for y in years},
           "variants": {}}
    frozen = {}
    for vname, feats in [("v3_resident", RES), ("v3_bhw", BHW)]:
        rows = []
        oof_all = {}
        for cand in candidates():
            oof = np.zeros(len(d))
            excess, aucs = 0, []
            for yr in years:
                te = (d.year == yr).values
                m = fit(cand, d[~te], feats)
                p = m.predict(d[te])
                oof[te] = p
                yy = d.albuminuria.values[te].astype(int)
                rule = rule_baseline(d[te]).values
                found = int(((top_share_flag(p, rule.mean()) == 1) & (yy == 1)).sum())
                excess += found - int(((rule == 1) & (yy == 1)).sum())
                aucs.append(roc_auc_score(yy, p))
            rows.append({"id": cand["id"], "cv_excess_cases": excess, "cv_mean_auroc": float(np.mean(aucs)),
                         "cv_auroc_by_year": dict(zip(years, map(float, aucs)))})
            oof_all[cand["id"]] = oof
            print(vname, cand["id"], excess, round(float(np.mean(aucs)), 4), flush=True)
        best = sorted(rows, key=lambda r: (-r["cv_excess_cases"], -r["cv_mean_auroc"]))[0]
        cand = next(c for c in candidates() if c["id"] == best["id"])
        y = d.albuminuria.values.astype(int)
        oof = oof_all[cand["id"]]
        # Platt recalibration on out-of-fold predictions, frozen
        pl = LogisticRegression(C=1e6, max_iter=5000).fit(logit(oof).reshape(-1, 1), y)
        a, b = float(pl.intercept_[0]), float(pl.coef_[0][0])
        oof_cal = 1 / (1 + np.exp(-(a + b * logit(oof))))
        thr = float(np.quantile(oof_cal[y == 1], 0.10))  # keeps >= 90% of training cases
        final = fit(cand, d, feats)
        frozen[vname] = {"model": final, "platt": (a, b), "threshold": thr}
        out["variants"][vname] = {"candidates": rows, "winner": best["id"], "platt_intercept": a, "platt_slope": b,
                                  "threshold_go_to_yakap": thr,
                                  "oof_share_referred_at_threshold": float((oof_cal >= thr).mean())}
    os.makedirs(OUT, exist_ok=True)
    json.dump(out, open(os.path.join(OUT, "step1_v3_cv.json"), "w"), indent=1)
    with open(os.path.join(OUT, "step1_v3_model.pkl"), "wb") as f:
        pickle.dump(frozen, f)
    print(json.dumps({v: {k: x for k, x in out["variants"][v].items() if k != "candidates"} for v in out["variants"]}, indent=1))


# ---------- score mode (run once) ----------
def auc_ci(y, p, idx):
    est = float(roc_auc_score(y, p))
    bs = [roc_auc_score(y[i], p[i]) for i in idx]
    return est, float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))


def run_score(paths):
    d, flow = cohort(paths)
    assert sorted(d.year.unique()) == TEST_YEARS, "score mode is for KNHANES 2019-2020 only"
    model_path = os.path.join(OUT, "step1_v3_model.pkl")
    frozen = pickle.load(open(model_path, "rb"))
    y = d.albuminuria.values.astype(int)
    rng = np.random.default_rng(SEED)
    idx = [rng.integers(0, len(y), len(y)) for _ in range(N_BOOT)]
    rule, rule_q = rule_baseline(d).values, rule_questions_only(d).values
    share, share_q = rule.mean(), rule_q.mean()
    wt = d.wt.values / len(paths)
    wok = ~np.isnan(wt)
    out = {"model_sha256": hashlib.sha256(open(model_path, "rb").read()).hexdigest(),
           "script_sha256": hashlib.sha256(open(os.path.abspath(__file__), "rb").read()).hexdigest(),
           "flow": flow, "n": len(y), "cases": int(y.sum()), "prevalence": float(y.mean()),
           "rule": {"share": float(share), "found": int(((rule == 1) & (y == 1)).sum()),
                    "auroc": auc_ci(y, rule.astype(float), idx)},
           "rule_questions_only": {"share": float(share_q), "found": int(((rule_q == 1) & (y == 1)).sum())}}
    for vname, fz in frozen.items():
        a, b = fz["platt"]
        p = 1 / (1 + np.exp(-(a + b * logit(fz["model"].predict(d)))))
        est, lo, hi = auc_ci(y, p, idx)
        diff = lambda f, r, i: int(((f[i] == 1) & (y[i] == 1)).sum()) - int(((r[i] == 1) & (y[i] == 1)).sum())
        flag = top_share_flag(p, share)
        bd = [int(((top_share_flag(p[i], share) == 1) & (y[i] == 1)).sum()) - int(((rule[i] == 1) & (y[i] == 1)).sum()) for i in idx]
        slope, citl = calib(y, p)
        bsl = [calib(y[i], p[i]) for i in idx[:200]]
        at_thr = (p >= fz["threshold"]).astype(int)
        r = {"auroc": est, "ci": [lo, hi],
             "auroc_weighted": float(roc_auc_score(y[wok], p[wok], sample_weight=wt[wok])),
             "found_at_rule_share": int(((flag == 1) & (y == 1)).sum()),
             "diff_vs_rule": int(((flag == 1) & (y == 1)).sum()) - out["rule"]["found"],
             "diff_ci": [float(np.percentile(bd, 2.5)), float(np.percentile(bd, 97.5))],
             "calibration_slope": slope, "calibration_slope_ci": [float(np.percentile([s for s, _ in bsl], 2.5)), float(np.percentile([s for s, _ in bsl], 97.5))],
             "citl": citl, "mean_predicted": float(p.mean()),
             "at_threshold": {"share_referred": float(at_thr.mean()), "sensitivity": float(at_thr[y == 1].mean()),
                              "ppv": float(y[at_thr == 1].mean())}}
        if vname == "v3_resident":
            fq = top_share_flag(p, share_q)
            r["diff_vs_questions_only_rule"] = int(((fq == 1) & (y == 1)).sum()) - out["rule_questions_only"]["found"]
        r["subgroups"] = {}
        for nm, m in [("female", d.female == 1), ("male", d.female == 0), ("age<50", d.age < 50), ("age50+", d.age >= 50)]:
            m = m.values
            r["subgroups"][nm] = {"n": int(m.sum()), "cases": int(y[m].sum()), "auroc": float(roc_auc_score(y[m], p[m]))}
        r["pass"] = {"1_auroc_lb_gt_0.70": lo > 0.70, "2_more_cases_ci_excl_0": r["diff_ci"][0] > 0,
                     "3_calibration": 0.8 <= slope <= 1.2 and -0.2 <= citl <= 0.2}
        r["pass"]["overall"] = r["pass"]["1_auroc_lb_gt_0.70"] and r["pass"]["2_more_cases_ci_excl_0"]
        out[vname] = r
    json.dump(out, open(os.path.join(OUT, "step1_v3_test.json"), "w"), indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    mode, paths = sys.argv[1], sys.argv[2:]
    {"fit": run_fit, "score": run_score}[mode](paths)
