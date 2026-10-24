"""Figure 1: screening pathway with measured per-100 numbers from results/results.json."""
import json, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, "results", "results.json")))
p = R["pathway"]["per100"]
fig, ax = plt.subplots(figsize=(10, 3.3)); ax.set_xlim(0, 100); ax.set_ylim(0, 33); ax.axis("off")
def box(x, w, title, body, fc):
    ax.add_patch(FancyBboxPatch((x, 6), w, 22, boxstyle="round,pad=0.4,rounding_size=1.5", fc=fc, ec="#0b6e4f", lw=1.2))
    ax.text(x + w / 2, 24.5, title, ha="center", va="center", fontsize=10, weight="bold")
    ax.text(x + w / 2, 15, body, ha="center", va="center", fontsize=8.3, linespacing=1.35)
def arrow(x0, x1):
    ax.annotate("", xy=(x1, 17), xytext=(x0, 17), arrowprops=dict(arrowstyle="-|>", color="#0b6e4f", lw=1.6))
box(1, 18, "Resident / BHW", "Step 1 questionnaire\n(age, sex, diabetes, BP,\nBMI, smoking, history)\nno labs, stores nothing", "#f2f7f5")
arrow(19.8, 22.2)
box(23, 19, "YAKAP clinic", "Free consult + labs YAKAP\nalready covers: HbA1c,\ncreatinine (eGFR), lipids,\nCBC; measured BP", "#f2f7f5")
arrow(42.8, 45.2)
box(46, 17, "Step 2 model", "Risk of uACR ≥30 mg/g\nlevel + top reasons\n(exact SHAP)", "#e3f3ec")
arrow(63.8, 66.2)
box(67, 15, "Doctor decides", "approve / override\n(reason required)\nprints referral", "#f2f7f5")
arrow(82.8, 85.2)
box(86, 13, "uACR test", "not in YAKAP;\nif ≥30 twice or\neGFR <60 →\nnephrologist", "#fbe9e7")
ax.text(10, 2.2, f"Per 100 adults: {p['step1_sent_to_yakap']:.0f} invited", ha="center", fontsize=8.3, color="#333")
ax.text(32.5, 2.2, f"{p['step1_cases_among_sent']:.1f} of {p['cases']:.1f} cases reach clinic", ha="center", fontsize=8.3, color="#333")
ax.text(54.5, 2.2, f"{p['step2_referred_uacr']:.0f} referred", ha="center", fontsize=8.3, color="#333")
ax.text(80, 2.2, f"{p['step2_cases_found']:.1f} cases found (NHANES 2017–2020 test set)", ha="center", fontsize=8.3, color="#333")
plt.tight_layout(); plt.savefig(os.path.join(ROOT, "results", "fig_pathway.png"), dpi=220)
