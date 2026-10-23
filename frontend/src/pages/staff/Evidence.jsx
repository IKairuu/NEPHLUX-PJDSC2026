import { PassChip } from '../../components/Chip'
import { EV, STEP1_V2 } from '../../data/evidence'
import { f3, pct } from '../../lib/format'
import { Head } from './ui'

const ci = (o) => <>{f3(o.auroc)} <span className="muted">({f3(o.ci[0])}–{f3(o.ci[1])})</span></>

function CiPlot({ items }) {
  const x0 = 0.5, x1 = 0.85, W = 640, left = 220, rowH = 38, H = items.length * rowH + 50
  const X = (v) => left + ((v - x0) / (x1 - x0)) * (W - left - 20)
  const mono = { fontFamily: 'JetBrains Mono,monospace' }
  return (
    <svg className="ci-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="AUROC with 95% confidence intervals">
      <rect x={X(0.68)} y="6" width={X(0.73) - X(0.68)} height={items.length * rowH} style={{ fill: 'var(--accent-soft)' }} />
      <text x={(X(0.68) + X(0.73)) / 2} y={items.length * rowH + 22} style={{ fill: 'var(--accent)', ...mono }} fontSize="11" textAnchor="middle">MERWACS 0.68–0.73</text>
      {[0.5, 0.6, 0.7, 0.8].map((t) => (
        <g key={t}>
          <line x1={X(t)} x2={X(t)} y1="6" y2={items.length * rowH + 6} style={{ stroke: 'var(--line)' }} />
          <text x={X(t)} y={items.length * rowH + 40} fontSize="11" textAnchor="middle" style={mono}>{t.toFixed(1)}</text>
        </g>
      ))}
      {items.map(([label, o, col], i) => {
        const y = 6 + i * rowH + rowH / 2
        return (
          <g key={label}>
            <text className="lbl" x="0" y={y + 4} fontSize="14">{label}</text>
            <line x1={X(o.ci[0])} x2={X(o.ci[1])} y1={y} y2={y} style={{ stroke: col }} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx={X(o.auroc)} cy={y} r="5.5" style={{ fill: col }} />
          </g>
        )
      })}
    </svg>
  )
}

// The frozen model's test-set results. Static research numbers, the same for every clinic.
export default function Evidence() {
  const a = EV.test_auroc, m = EV.matched, pm = EV.pass_mark
  const items = [
    ['Step 2 · YAKAP labs', a.step2_lr, 'var(--accent)'], ['Step 2 · boosted trees*', a.step2_gbt, 'var(--plum)'], ['Step 1 · questionnaire', a.step1_lr, 'var(--mod)'],
    ['Rule · diabetes or high BP', a.rule_dm_or_htn, 'var(--muted)'], ['Age alone', a.age_only, 'var(--faint)'], ['eGFR < 60 alone', a.egfr_lt60_only, 'var(--faint)'],
  ]
  const pass = [
    ['Step 2 AUROC CI above 0.70', pm['c1_auroc_ci_lower_gt_0.70']], ['Step 2 beats the rule at equal referrals', pm.c2_more_cases_than_rule_at_same_referrals],
    [`Step 2 calibration slope 0.8–1.2 (${EV.calibration_slope_step2.toFixed(2)})`, pm['c3_calibration_slope_0.8_1.2']],
    ['Step 1 AUROC CI above 0.70', pm['step1_auroc_ci_lower_gt_0.70']], ['Step 1 beats the rule', pm.step1_more_cases_than_rule],
  ]
  const amn = 0.7, amx = 0.78

  return (
    <>
      <Head eyebrow="Evidence · model card" title={<>Does it <span className="serif">work</span>?</>}
        text={`Trained on NHANES 2011–2016 (${EV.n.train.toLocaleString()} U.S. adults without known kidney disease), tested once on 2017–March 2020 (${EV.n.test.toLocaleString()} adults, ${EV.n.test_cases} with uACR ≥30 mg/g). Not yet validated in Filipino patients.`} />
      <div className="cols">
        <div className="card">
          <div className="eyebrow">Discrimination · AUROC with 95% bootstrap CI</div>
          <div className="max-sm:hidden mt-2"><CiPlot items={items} /></div>
          <table className="t mt-2 sm:hidden">
            <tbody>
              {items.map(([label, o, col]) => <tr key={label}><td><span style={{ color: col }}>●</span> {label}</td><td className="num">{ci(o)}</td></tr>)}
              <tr><td>MERWACS (reported)</td><td className="num">0.68–0.73</td></tr>
            </tbody>
          </table>
          <p className="muted text-[12.5px] mt-1.5">MERWACS (Yoo et al., 2026) predicts a composite outcome, so its band is a reference, not a head-to-head test. *Boosted trees were not chosen: their cross-validated gain was under 0.01.</p>
        </div>
        <div className="card">
          <div className="eyebrow">Pre-registered pass mark</div>
          {pass.map(([t, ok]) => <div className="passrow" key={t}><span>{t}</span><PassChip pass={ok} /></div>)}
          <div className="eyebrow mt-[18px]">Same referrals as the rule ({pct(m.rule.referred / EV.n.test)})</div>
          <table className="t">
            <thead><tr><th /><th className="num">Found</th><th className="num">Sens.</th><th className="num">PPV</th></tr></thead>
            <tbody>
              {[['Rule', m.rule], ['Step 1', m.step1_lr], ['Step 2', m.step2_lr]].map(([n, r]) => (
                <tr key={n}><td>{n}</td><td className="num">{r.cases_found}</td><td className="num">{pct(r.sensitivity, 1)}</td><td className="num">{pct(r.ppv, 1)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cards3 mt-3.5">
        <div className="card">
          <div className="eyebrow">Which YAKAP tests add value</div>
          {EV.ablation.map((o) => (
            <div className="hb grid-cols-[130px_minmax(0,1fr)_46px]" key={o.model}>
              <span>{o.model}</span>
              <span className="tr"><i style={{ width: `${Math.max(2, (100 * (o.auroc - amn)) / (amx - amn)).toFixed(0)}%` }} /></span>
              <span className="num mono">{f3(o.auroc)}</span>
            </div>
          ))}
          <p className="muted text-[12.5px] mt-2">HbA1c and creatinine carry most of the gain; the lipid profile adds nothing measurable.</p>
        </div>
        <div className="card">
          <div className="eyebrow">Asian participants · {EV.asian.n} people, {EV.asian.cases} cases</div>
          <table className="t mt-2">
            <tbody>
              <tr><td>Step 2</td><td className="num">{ci(EV.asian.step2_lr)}</td></tr>
              <tr><td>Step 1</td><td className="num">{ci(EV.asian.step1_lr)}</td></tr>
              <tr><td>Rule</td><td className="num">{ci(EV.asian.rule_dm_or_htn)}</td></tr>
            </tbody>
          </table>
          <p className="muted text-[12.5px] mt-2">Lower bound under 0.70: uncertain. NHANES Asian Americans are not Cagayan de Oro residents.</p>
        </div>
        <div className="card">
          <div className="eyebrow">Limits</div>
          <ul className="mt-2 pl-[18px] list-disc muted text-[13.5px] grid gap-1">
            <li>U.S. training data; no Filipino validation yet (KNHANES next).</li>
            <li>No dipstick urinalysis in NHANES.</li>
            <li>uACR measured once; guidelines confirm over 3 months.</li>
            <li>BP device changed between training and test cycles.</li>
            <li>uACR price is assumed; dialysis avoided not measured.</li>
          </ul>
        </div>
      </div>

      <div className="card mt-3.5">
        <div className="eyebrow">Resident check, version 2 · pass mark written 23 Oct 2026 before fitting</div>
        <div className="tw mt-2">
          <table className="t">
            <thead><tr><th>Model</th><th className="num">AUROC (95% CI)</th><th className="num">Found vs rule</th><th className="num">Gain</th><th /></tr></thead>
            <tbody>
              {STEP1_V2.rows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td><td className="num">{ci(r)}</td><td className="num">{r.found} vs {STEP1_V2.rule_cases_found}</td>
                  <td className="num">{r.gain >= 0 ? '+' : ''}{r.gain}</td><td className="text-right"><PassChip pass={r.pass} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted text-[12.5px] mt-2">Both versions 2 fail "more cases than the rule", so the resident check stays <b>awareness only</b>. The clean next test is KNHANES.</p>
      </div>
    </>
  )
}
