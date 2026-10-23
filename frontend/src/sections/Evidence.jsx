import { PassChip } from '../components/Chip'
import SectionHead from '../components/SectionHead'
import { EV } from '../data/evidence'
import { f3, pct } from '../lib/format'
import { useUIStore } from '../store/useUIStore'

export default function Evidence() {
  const navigate = useUIStore((s) => s.navigate)
  const a = EV.test_auroc, m = EV.matched, P = EV.prevalence, pm = EV.pass_mark, gain = EV.extra_cases_step2
  const rows = [
    ['Step 2 AUROC lower bound above 0.70', pm['c1_auroc_ci_lower_gt_0.70']],
    ['Step 2 finds more cases than "diabetes or high BP" at equal referrals', pm.c2_more_cases_than_rule_at_same_referrals],
    [`Step 2 calibration slope 0.8–1.2 (${EV.calibration_slope_step2.toFixed(2)})`, pm['c3_calibration_slope_0.8_1.2']],
    ['Step 1 (no labs) AUROC lower bound above 0.70', pm['step1_auroc_ci_lower_gt_0.70']],
    ['Step 1 finds more cases than the rule', pm.step1_more_cases_than_rule],
  ]
  const stats = [
    ['Step 2 AUROC', f3(a.step2_lr.auroc)],
    ['Rule AUROC', f3(a.rule_dm_or_htn.auroc)],
    ['Calibration', EV.calibration_slope_step2.toFixed(2)],
  ]
  return (
    <section className="sec" id="evidence" aria-labelledby="eT">
      <div className="wrap">
        <SectionHead eyebrow="Evidence" id="eT"
          title={<>A pass mark written <span className="serif">before</span> training.</>}
          text="Trained on NHANES 2011–2016, tested once on 2017–March 2020. Where it failed, it says so." />
        <div className="evi reveal">
          <div className="card">
            <div className="eyebrow">Same number of tests, more cases</div>
            <div className="bigstat mt-3.5">+{gain[0]}<small>cases</small></div>
            <p className="muted mt-3">
              Referring the same {pct(m.rule.referred / EV.n.test)} of {EV.n.test.toLocaleString('en-US')} test adults as "everyone with diabetes or high blood pressure", the lab model found {m.step2_lr.cases_found} of {EV.n.test_cases} cases and the rule found {m.rule.cases_found} (95% CI of the gain +{Math.round(gain[1])} to +{Math.round(gain[2])}). A real but modest gain.
            </p>
            <div className="grid grid-cols-3 gap-3.5 mt-[18px] max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
              {stats.map(([label, v]) => <div key={label}><div className="eyebrow">{label}</div><div className="mono text-[22px]">{v}</div></div>)}
            </div>
            <p className="muted text-[12.5px] mt-3.5">
              {pct(P.test_cases_with_egfr_ge60_share)} of cases had a normal-looking creatinine, and {pct(P.test_cases_without_dm_or_htn_share)} had neither diabetes nor high blood pressure.
            </p>
          </div>
          <div className="card">
            <div className="eyebrow">Pass mark · written before training</div>
            {rows.map(([label, pass]) => <div className="passrow" key={label}><span>{label}</span><PassChip pass={pass} /></div>)}
            <p className="muted text-[12.5px] mt-3">Step 1, the questionnaire, did no better than the simple rule, so the resident check stays awareness only. Not yet validated in Filipino patients.</p>
            <button className="btn sm mt-3.5" onClick={() => navigate('evidence')}>Open the full evidence</button>
          </div>
        </div>
      </div>
    </section>
  )
}
