import Icon from '../components/Icon'
import SectionHead from '../components/SectionHead'
import { EV, EXPECTED, RESIDENT_ROWS, STEP2U as U } from '../data/evidence'
import { f3, pct } from '../lib/format'
import { useGo } from '../hooks/useGo'

export default function Evidence() {
  const navigate = useGo()
  const pm = EV.pass_mark, m = U.matched
  // grouped by what each model is allowed to do: only the clinic models drive referrals
  const clinic = [
    ['Step 2U (Korean test) passes C1–C3: AUROC, more cases than rule-or-dipstick, beats labs-only', U.pass.c1_c3],
    [`Step 2U calibration slope 0.8–1.2 (${U.calibration.slope.toFixed(2)})`, U.pass.c4_calibration],
    ['Step 2 (U.S. test) AUROC lower bound above 0.70', pm['c1_auroc_ci_lower_gt_0.70']],
    ['Step 2 (U.S. test) finds more cases than "diabetes or high BP"', pm.c2_more_cases_than_rule_at_same_referrals],
  ]
  const trio = [
    ['Step 2U AUROC', f3(U.auroc.auroc)],
    ['Rule or dipstick', f3(U.auroc_comparator.auroc)],
    ['Calibration', U.calibration.slope.toFixed(2)],
  ]
  const s2k = U.step2_vs_plain_rule
  return (
    <section className="sec" id="evidence" aria-labelledby="eT">
      <div className="wrap">
        <SectionHead eyebrow="Evidence" id="eT"
          title={<>A pass mark written <span className="serif">before training.</span></>}
          text="Step 2U learned on Korean KNHANES 2021–2024 and was tested once on 2019–2020; Step 2 on U.S. NHANES. Every criterion set before training is shown here." />
        <div className="evi reveal">
          <div>
            <div className="eyebrow">Step 2U · same number of tests, more cases</div>
            <div className="bigstat mt-[18px]">+{m.step2u.extra}<small>cases</small></div>
            <p className="muted mt-[18px] max-w-[560px]">
              Referring the same {pct(U.comparator_share)} of {U.n.toLocaleString('en-US')} Korean test adults (KNHANES 2019–2020) as "diabetes, high BP or dipstick protein 1+", Step 2U (labs + dipstick) found {m.step2u.cases_found} of {U.cases} cases and the comparator {m.comparator.cases_found} (95% CI of the gain +{m.step2u.extra_ci[0]} to +{m.step2u.extra_ci[1]}).
            </p>
            <div className="trio">
              {trio.map(([label, v]) => <div key={label}><div className="eyebrow">{label}</div><span className="mono">{v}</span></div>)}
            </div>
            <p className="muted text-[13px] mt-4">
              Among adults with neither diabetes nor high BP, Step 2U caught {pct(U.no_dm_no_htn.step2u_sensitivity)} of cases vs {pct(U.no_dm_no_htn.comparator_sensitivity)} for the comparator. Without the dipstick, the U.S. labs-only Step 2 found +{s2k.extra} vs the plain rule on the same Korean adults (95% CI {s2k.extra_ci[0]} to +{s2k.extra_ci[1]}): not clearly better. That is why the dipstick matters.
            </p>
          </div>
          <div>
            <div className="eyebrow">Pass mark · written before training</div>
            <div className="pm-group">Clinic models (used for referrals)</div>
            <ul className="pm mt-1.5">
              {clinic.map(([label, pass]) => (
                <li key={label} className={pass ? 'ok' : 'no'}>
                  <span className="mk"><Icon name={pass ? 'check' : 'dot'} className="" /></span>
                  <span>{label}</span>
                  <span className={`chip ${pass ? 'pass' : 'notmet'}`}>{pass ? 'Pass' : 'Not met'}</span>
                </li>
              ))}
            </ul>
            <div className="pm-group">Resident check (awareness only)</div>
            <ul className="pm mt-1.5">
              {RESIDENT_ROWS.map(([label, chip, kind]) => (
                <li key={label} className="aw">
                  <span className="mk"><Icon name={kind === 'info' ? 'check' : 'dot'} className="" /></span>
                  <span>{label}</span>
                  <span className={`chip ${kind}`}>{chip}</span>
                </li>
              ))}
            </ul>
            <p className="pm-note">{EXPECTED}</p>
            <p className="muted text-[13px] mt-2">Not yet validated in Filipino patients.</p>
            <button className="btn sm mt-4" onClick={() => navigate('evidence')}>Open the full evidence</button>
          </div>
        </div>
      </div>
    </section>
  )
}
