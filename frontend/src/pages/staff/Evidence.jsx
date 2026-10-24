import { Chip, PassChip } from '../../components/Chip'
import { EV, EXPECTED, RESIDENT_GROUP, RESIDENT_ROWS, STEP1_V2, STEP2U } from '../../data/evidence'
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

// Step 2U: labs + YAKAP urine dipstick, learned and tested on Korean KNHANES
function Step2UCard() {
  const t = STEP2U, m = t.matched, b = t.budget50
  return (
    <div className="card">
      <div className="eyebrow">Step 2U · YAKAP labs + urine dipstick · learned on KNHANES 2021–2024, tested once on 2019–2020</div>
      <div className="cols mt-2.5">
        <div>
          <div className="bigstat">+{m.step2u.extra}<small>cases</small></div>
          <p className="muted mt-3 text-sm">
            Referring the same {pct(t.comparator_share)} of {t.n.toLocaleString()} Korean test adults as "diabetes, high BP or dipstick protein 1+", Step 2U found {m.step2u.cases_found} of {t.cases} cases and the comparator {m.comparator.cases_found} (95% CI of the gain +{m.step2u.extra_ci[0]} to +{m.step2u.extra_ci[1]}). Sensitivity {pct(m.step2u.sensitivity, 1)} vs {pct(m.comparator.sensitivity, 1)}.
          </p>
          <p className="muted text-[13px] mt-2">
            With only 50 uACR tests per 1,000 adults: {b.model.toFixed(1)} cases found vs {b.comparator.toFixed(1)}, about ₱{Math.round(b.cost_per_case_model).toLocaleString()} per case vs ₱{Math.round(b.cost_per_case_comparator).toLocaleString()} at ₱600 a test (public or bulk, assumed). At the published retail price (₱1,500–3,500): ₱1,887–4,404 vs ₱8,203–19,141 per case.
          </p>
        </div>
        <div>
          <table className="t">
            <thead><tr><th>Korean test set</th><th className="num">AUROC (95% CI)</th></tr></thead>
            <tbody>
              <tr><td>Step 2U · labs + dipstick</td><td className="num">{ci(t.auroc)}</td></tr>
              <tr><td>Rule OR dipstick 1+</td><td className="num">{ci(t.auroc_comparator)}</td></tr>
              <tr><td>Rule · diabetes or high BP</td><td className="num">{ci(t.auroc_rule)}</td></tr>
              <tr><td>Step 2 · labs only</td><td className="num">{ci(t.auroc_step2)}</td></tr>
            </tbody>
          </table>
          <div className="passrow mt-2.5"><span>Pass mark C1–C3 (written before fitting)</span><PassChip pass={t.pass.c1_c3} /></div>
          <div className="passrow"><span>Calibration slope {t.calibration.slope.toFixed(2)}, CITL {t.calibration.citl.toFixed(2)}</span><PassChip pass={t.pass.c4_calibration} /></div>
          <p className="muted text-[12.5px] mt-2">Korean adults, not Filipinos; KNHANES reads the strip in a lab, YAKAP clinics may read it by eye. All clean KNHANES test years are now used, so the next test must be Filipino YAKAP records (about 2,800–4,400 adults). Without the dipstick, Step 2 on the same Korean set was not clearly better than the plain rule.</p>
        </div>
      </div>
    </div>
  )
}

// The frozen model's test-set results. Static research numbers, the same for every clinic.
export default function Evidence() {
  const a = EV.test_auroc, m = EV.matched, pm = EV.pass_mark
  const items = [
    ['Step 2 · YAKAP labs', a.step2_lr, 'var(--accent)'], ['Step 2 · boosted trees*', a.step2_gbt, 'var(--plum)'], ['Step 1 · questionnaire', a.step1_lr, 'var(--mod)'],
    ['Rule · diabetes or high BP', a.rule_dm_or_htn, 'var(--muted)'], ['Age alone', a.age_only, 'var(--faint)'], ['eGFR < 60 alone', a.egfr_lt60_only, 'var(--faint)'],
  ]
  const clinic = [
    ['Step 2 AUROC CI above 0.70', pm['c1_auroc_ci_lower_gt_0.70']], ['Step 2 beats the rule at equal referrals', pm.c2_more_cases_than_rule_at_same_referrals],
    [`Step 2 calibration slope 0.8–1.2 (${EV.calibration_slope_step2.toFixed(2)})`, pm['c3_calibration_slope_0.8_1.2']],
  ]
  const amn = 0.7, amx = 0.78

  return (
    <>
      <Head eyebrow="Evidence · model card" title={<>Does it <span className="serif">work</span>?</>}
        text={`Two lab models. With the YAKAP dipstick: Step 2U, learned on Korean KNHANES 2021–2024 and tested once on 2019–2020. Without it: Step 2, trained on NHANES 2011–2016 (${EV.n.train.toLocaleString()} U.S. adults without known kidney disease), tested once on 2017–March 2020 (${EV.n.test.toLocaleString()} adults, ${EV.n.test_cases} with uACR ≥30 mg/g). Not yet validated in Filipino patients.`} />
      <Step2UCard />
      <div className="cols mt-3.5">
        <div className="card">
          <div className="eyebrow">Step 2 (labs only, U.S. NHANES) · AUROC with 95% bootstrap CI</div>
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
          <div className="pm-group">Clinic models (used for referrals)</div>
          {clinic.map(([t, ok]) => <div className="passrow" key={t}><span>{t}</span><PassChip pass={ok} /></div>)}
          <div className="pm-group">{RESIDENT_GROUP}</div>
          {RESIDENT_ROWS.map(([t, chip, kind, , icon]) => <div className="passrow" key={t}><span>{t}</span><Chip kind={kind} icon={icon}>{chip}</Chip></div>)}
          <p className="pm-note">{EXPECTED}</p>
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
            <li>U.S. (Step 2) and Korean (Step 2U) data; no Filipino validation yet.</li>
            <li>No dipstick in NHANES, so Step 2 cannot use it; Step 2U does.</li>
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
                  <td className="num">{r.gain >= 0 ? '+' : ''}{r.gain}</td><td className="text-right">{r.pass ? <PassChip pass /> : <Chip kind="info" icon="check">On par</Chip>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted text-[12.5px] mt-2">Every version finds about as many cases as the rule, which is what a phone check without labs can do, so the resident check stays <b>awareness only</b>. The clean next test is KNHANES.</p>
      </div>
    </>
  )
}
