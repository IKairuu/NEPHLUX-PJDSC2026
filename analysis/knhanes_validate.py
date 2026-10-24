"""External test of the FROZEN models on KNHANES (Korea). Judged against PASS_MARK_KNHANES.md.

Usage:  .venv/bin/python -I analysis/knhanes_validate.py data/knhanes/hn21_all.sas7bdat data/knhanes/hn22_all.sas7bdat \
            data/knhanes/hn23_all.sas7bdat data/knhanes/hn24_all.sas7bdat
Inputs: KNHANES 2021-2024 Basic DB SAS files (free, but each user must register and agree to the KDCA terms;
        files are not redistributed here). Put them in data/knhanes/ (gitignored).
Outputs: results/knhanes.json

Nothing is refitted. Coefficients and thresholds come from web/model.js (exported by run_all.py) and, for the
secondary step 1 v2 models, from results/step1_v2.json.

Variable check (2026-10-23, before any prediction was scored): every name in KMAP was checked against the
variable labels stored in the 2021-2024 files and their value codes. Changes from the first draft:
  - BP: KNHANES HE_sbp/HE_dbp are the mean of readings 2 and 3. NHANES used the mean of all readings, so the
    mean of HE_sbp1-3 / HE_dbp1-3 is used instead (pass mark: "mean of the available readings, as in NHANES").
  - bp_med: DI1_2 codes 1-4 (daily / 20+ days / 15-19 / <15 days a month) = currently takes BP medicine,
    5 = not taking, 8 = no hypertension. NHANES BPQ050A asks "now taking", so codes 1-4 count, not only 1.
  - Urine albumin: values below the reporting limit are blank in HE_Ualb and flagged in HE_Ualb_etc ("<1.0" in
    2021, "<3.0" in 2022-2024); values above it are flagged ">5000.0" / ">4400.0". Dropping the blanks would
    remove about a quarter of adults, nearly all without albuminuria. As in NHANES (below-limit albumin is
    filled with limit / sqrt(2)), below-limit values are set to limit / sqrt(2), above-limit values to the limit.
  - CVD (DI3_dg stroke, DI5_dg MI, DI6_dg angina) is not in the 2022 and 2023 files. For those years cvd_hx is
    not collected and is set to the NHANES training mean (pass-mark rule). No heart-failure item in any year.
  - Step 1 v2 extras: dm_meds = DE1_31 (insulin) or DE1_32 (diabetes pills); chol_hx = DI2_dg; ever_smoked =
    BS1_1 == 2 (5+ packs = 100+ cigarettes, as NHANES SMQ020). prediabetes and nocturia are not asked in
    KNHANES and are set to the training mean.
  - Questionnaire codes 8 (not applicable) and 9 (don't know) count as "no", as 7/9 do in run_all.py.
  - Weighted AUROC: wt_itvex divided by the number of pooled years (KDCA guidance for pooled years).
"""
import json
import os
import re
import sys

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_all as R0  # noqa: E402
import step1_v2 as S1  # noqa: E402

CONFIRMED = True  # every name in KMAP checked against the 2021-2024 file labels and codes (see docstring)

# meaning -> KNHANES name. Checked 2026-10-23 (label from the 2021 file in brackets).
KMAP = {
    "age": "age",              # 만나이 (age in years, top-coded 80)
    "sex": "sex",              # 성별: 1 male, 2 female
    "wt": "wt_itvex",          # 건강설문,검진조사 가중치
    "sbp": ["HE_sbp1", "HE_sbp2", "HE_sbp3"],  # 1-3차 수축기 혈압
    "dbp": ["HE_dbp1", "HE_dbp2", "HE_dbp3"],  # 1-3차 이완기 혈압
    "bmi": "HE_BMI",           # 체질량지수
    "hba1c": "HE_HbA1c",       # 당화혈색소, %
    "creat": "HE_crea",        # 혈중크레아티닌, mg/dL
    "tchol": "HE_chol",        # 총콜레스테롤, mg/dL
    "hdl": "HE_HDL_st2",       # HDL-콜레스테롤, mg/dL
    "hgb": "HE_HB",            # 헤모글로빈, g/dL
    "wbc": "HE_WBC",           # 백혈구, x10^3/uL = x10^9/L
    "plt": "HE_Bplt",          # 혈소판, x10^3/uL = x10^9/L
    "u_alb": "HE_Ualb",        # 요알부민, mg/L
    "u_alb_flag": "HE_Ualb_etc",  # 요알부민 장비분석범위 / 보고범위
    "u_crea": "HE_Ucrea",      # 요크레아티닌, mg/dL
    "dm_dx": "DE1_dg",         # 당뇨병 의사진단 여부: 0 no, 1 yes, 9 don't know
    "htn_dx": "DI1_dg",        # 고혈압 의사진단 여부
    "bp_med": "DI1_2",         # 혈압조절제 복용: 1-4 taking, 5 not, 8 n/a
    "smoke_now": "BS3_1",      # 현재 흡연 여부: 1 daily, 2 sometimes, 3 former, 8 n/a
    "fam_dm": ["HE_DMfh1", "HE_DMfh2", "HE_DMfh3"],  # 당뇨병 의사진단 여부 (부 / 모 / 형제자매)
    "cvd": ["DI3_dg", "DI5_dg", "DI6_dg"],           # 뇌졸중 / 심근경색증 / 협심증 (2021, 2024 only)
    "kidney": "DN1_dg",        # 콩팥병(신장질환) 의사진단 여부
    "pregnant": "HE_prg",      # 임신여부: 1 yes
    "dm_meds": ["DE1_31", "DE1_32"],  # 인슐린 주사 / 당뇨병약
    "chol_hx": "DI2_dg",       # 이상지질혈증 의사진단 여부
    "ever_smoked": "BS1_1",    # 평생 흡연 여부: 1 <5 packs, 2 5+ packs, 3 never
}
NOT_COLLECTED = ["prediabetes", "nocturia2"]  # set to the NHANES training mean


def yes(s):
    return (s == 1).astype(int)


def load(path):
    raw = pd.read_sas(path, format="sas7bdat", encoding=None)
    flag = raw[KMAP["u_alb_flag"]]
    raw[KMAP["u_alb_flag"]] = flag.map(lambda b: b.decode("ascii", "replace") if isinstance(b, bytes) else (b or ""))
    raw["year_file"] = os.path.basename(path)
    raw["cvd_collected"] = all(c in raw.columns for c in KMAP["cvd"])
    for c in KMAP["cvd"]:
        if c not in raw.columns:
            raw[c] = np.nan
    return raw


def urine_albumin(raw):
    a = raw[KMAP["u_alb"]].copy()
    f = raw[KMAP["u_alb_flag"]].fillna("").str.strip()
    lim = pd.to_numeric(f.str.lstrip("<>"), errors="coerce")
    below, above = a.isna() & f.str.startswith("<"), a.isna() & f.str.startswith(">")
    a[below] = lim[below] / np.sqrt(2)
    a[above] = lim[above]
    return a, int(below.sum()), int(above.sum())


def harmonise(raw):
    g = lambda k: raw[KMAP[k]]
    o = pd.DataFrame(index=raw.index)
    o["year_file"] = raw.year_file
    o["age"] = g("age")
    o["female"] = (g("sex") == 2).astype(int)
    o["wt"] = g("wt")
    o["pregnant"] = yes(g("pregnant"))
    o["known_kidney"] = yes(g("kidney"))
    ualb, n_below, n_above = urine_albumin(raw)
    o["uacr"] = ualb / g("u_crea") * 100  # (mg/L) / (mg/dL) * 100 = mg/g
    o["albuminuria"] = (o.uacr >= 30).astype(float).where(o.uacr.notna())
    o["dm_hx"], o["htn_hx"] = yes(g("dm_dx")), yes(g("htn_dx"))
    o["bp_med"] = g("bp_med").isin([1, 2, 3, 4]).astype(int)
    o["smoker"] = g("smoke_now").isin([1, 2]).astype(int)
    o["fam_dm"] = (raw[KMAP["fam_dm"]] == 1).any(axis=1).astype(int)
    o["cvd_hx"] = (raw[KMAP["cvd"]] == 1).any(axis=1).astype(float).where(raw.cvd_collected)  # NaN = not asked that year
    o["questionnaire_missing"] = g("dm_dx").isna() | g("htn_dx").isna()
    o["bmi"] = g("bmi")
    o["sbp"] = raw[KMAP["sbp"]].mean(axis=1)
    o["dbp"] = raw[KMAP["dbp"]].where(raw[KMAP["dbp"]] > 0).mean(axis=1)
    for k in ["hba1c", "creat", "tchol", "hdl", "hgb", "wbc", "plt"]:
        o[k] = g(k)
    o["egfr"] = R0.egfr_ckdepi2021(o.creat, o.age, o.female)
    # step 1 v2 extras
    o["dm_meds"] = (raw[KMAP["dm_meds"]] == 1).any(axis=1).astype(int)
    o["chol_hx"] = yes(g("chol_hx"))
    o["ever_smoked"] = (g("ever_smoked") == 2).astype(int)
    for c in NOT_COLLECTED:
        o[c] = np.nan
    return o, {"u_alb_below_limit_filled": n_below, "u_alb_above_limit_filled": n_above}


def load_model():
    src = open(os.path.join(R0.WEB, "model.js")).read()
    return json.loads(re.search(r"const BAGO_MODEL = (\{.*\});", src, re.S).group(1))


def predict(exp, X):
    X = X.copy()
    for c in X.columns:  # only items KNHANES does not collect are NaN here (complete case otherwise)
        X[c] = X[c].fillna(exp["mean"][c])
    lp = exp["intercept"] + sum(exp["coef"][c] * X[c] for c in exp["coef"])
    return 1 / (1 + np.exp(-lp))


def main(paths):
    if not CONFIRMED:
        sys.exit("Check every KMAP name against the KNHANES codebook, commit the fix, then set CONFIRMED = True.")
    parts = [harmonise(load(p)) for p in paths]
    d = pd.concat([x[0] for x in parts], ignore_index=True)
    lod = {os.path.basename(p): x[1] for p, x in zip(paths, parts)}
    flow = [("all", len(d))]
    for nm, mask in [("age 20+", d.age >= 20), ("not pregnant", d.pregnant == 0), ("has uACR", d.uacr.notna()),
                     ("answered DM/BP", ~d.questionnaire_missing), ("no known kidney disease", d.known_kidney == 0)]:
        d = d[mask.loc[d.index]]; flow.append((nm, len(d)))
    need = ["bmi", "sbp", "dbp", "hba1c", "egfr", "tchol", "hdl", "hgb", "wbc", "plt"]
    d = d[d[need].notna().all(axis=1)]; flow.append(("complete case", len(d)))
    d = d.reset_index(drop=True)
    M = load_model()
    V2 = json.load(open(os.path.join(R0.OUT, "step1_v2.json")))
    y = d.albuminuria.values.astype(int)
    rng = np.random.default_rng(R0.SEED)
    idx = [rng.integers(0, len(y), len(y)) for _ in range(R0.N_BOOT)]
    p2, p1 = predict(M["step2"], R0.design(d, 2)).values, predict(M["step1"], R0.design(d, 1)).values
    p1v2r = predict(V2["v2_resident"]["model"], S1.design_v2(d, "res")).values
    p1v2b = predict(V2["v2_bhw"]["model"], S1.design_v2(d, "bhw")).values
    rule = R0.rule_baseline(d).values
    share = rule.mean()
    wt = d.wt.values / len(paths)
    wok = ~np.isnan(wt)
    out = {"files": [os.path.basename(p) for p in paths], "flow": flow, "n": len(y), "cases": int(y.sum()),
           "prevalence_unweighted": float(y.mean()),
           "prevalence_weighted": float(np.sum(wt[wok] * y[wok]) / np.sum(wt[wok])),
           "cases_without_dm_or_htn_share": float(((rule == 0) & (y == 1)).sum() / y.sum()),
           "cases_with_egfr_ge60_share": float(((d.egfr.values >= 60) & (y == 1)).sum() / y.sum()),
           "by_year": {f: {"n": int((d.year_file == f).sum()), "cases": int(y[d.year_file.values == f].sum())}
                       for f in d.year_file.unique()},
           "urine_albumin_limits": lod,
           "deviations": {"cvd_hx_set_to_training_mean_n": int(d.cvd_hx.isna().sum()),
                          "not_collected_set_to_training_mean": NOT_COLLECTED + ["cvd_hx (2022, 2023 files)"],
                          "no_heart_failure_item": True, "weights_missing_n": int((~wok).sum())},
           "descriptives": {"age_mean": float(d.age.mean()), "female_pct": 100 * float(d.female.mean()),
                            "dm_pct": 100 * float(d.dm_hx.mean()), "htn_pct": 100 * float(d.htn_hx.mean()),
                            "egfr_lt60_pct": 100 * float((d.egfr < 60).mean()), "uacr_median": float(d.uacr.median()),
                            "sbp_mean": float(d.sbp.mean()), "hba1c_mean": float(d.hba1c.mean()),
                            "bmi_mean": float(d.bmi.mean())}}
    for nm, p in [("step2", p2), ("step1_v1", p1), ("step1_v2_resident", p1v2r), ("step1_v2_bhw", p1v2b),
                  ("rule", rule.astype(float))]:
        est, lo, hi = R0.auc_ci(y, p, idx)
        out[nm] = {"auroc": est, "ci": [lo, hi],
                   "auroc_weighted": float(roc_auc_score(y[wok], p[wok], sample_weight=wt[wok]))}
    found_rule = int(((rule == 1) & (y == 1)).sum())
    out["matched"] = {"rule_share": float(share), "rule_found": found_rule}
    for nm, p in [("step2", p2), ("step1_v1", p1), ("step1_v2_resident", p1v2r), ("step1_v2_bhw", p1v2b)]:
        found = int(((R0.top_share_flag(p, share) == 1) & (y == 1)).sum())
        bd = [int(((R0.top_share_flag(p[i], share) == 1) & (y[i] == 1)).sum()) - int(((rule[i] == 1) & (y[i] == 1)).sum()) for i in idx]
        out["matched"][nm] = {"found": found, "extra": found - found_rule,
                              "extra_ci": [float(np.percentile(bd, 2.5)), float(np.percentile(bd, 97.5))],
                              "referral_stats": R0.referral_stats(y, R0.top_share_flag(p, share))}
    out["matched"]["rule_stats"] = R0.referral_stats(y, rule)
    out["fixed_threshold_step2_high"] = R0.referral_stats(y, (p2 >= M["thresholds"]["step2_high"]).astype(int))
    out["calibration_step2"] = R0.calib(y, p2)
    out["calibration_step1_v1"] = R0.calib(y, p1)
    out["pass"] = {"c1": out["step2"]["ci"][0] > 0.70, "c2": out["matched"]["step2"]["extra_ci"][0] > 0,
                   "c3": 0.8 <= out["calibration_step2"]["slope"] <= 1.2}
    # recalibration, reported separately (random half to fit, other half to check)
    half = rng.random(len(y)) < 0.5
    lp = np.log(p2 / (1 - p2))
    import statsmodels.api as sm
    fit = sm.GLM(y[half], sm.add_constant(lp[half]), family=sm.families.Binomial()).fit()
    pr = 1 / (1 + np.exp(-(fit.params[0] + fit.params[1] * lp[~half])))
    out["recalibrated_check_half"] = {"intercept": float(fit.params[0]), "slope": float(fit.params[1]),
                                      "calibration_on_other_half": R0.calib(y[~half], pr)}
    with open(os.path.join(R0.OUT, "knhanes.json"), "w") as fh:
        json.dump(out, fh, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
    print(json.dumps({k: out[k] for k in ["flow", "n", "cases", "step2", "step1_v1", "rule", "matched", "calibration_step2", "pass"]},
                     indent=1, default=str))


if __name__ == "__main__":
    main(sys.argv[1:])
