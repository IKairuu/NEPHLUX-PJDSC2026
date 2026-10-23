import { EV, CLINIC_COUNT, BARANGAY_COUNT } from '../data/evidence'
import { f3 } from '../lib/format'

// The horizon carries the hero's colour into the dark zone; the stat bar floats across it.
export default function StatBar() {
  const a = EV.test_auroc
  return (
    <>
      <div className="horizon" aria-hidden="true" />
      <div className="wrap statwrap">
        <div className="statbar glass">
          <div><b>{f3(a.step2_lr.auroc)}</b><span>AUROC on held-out U.S. NHANES data (rule: {f3(a.rule_dm_or_htn.auroc)})</span></div>
          <div><b>+{EV.extra_cases_step2[0]}</b><span>cases found at the same number of uACR tests</span></div>
          <div><b>{CLINIC_COUNT}</b><span>YAKAP clinics in Cagayan de Oro, from PhilHealth's list</span></div>
          <div><b>{BARANGAY_COUNT}</b><span>barangays on the City Health Office map</span></div>
        </div>
      </div>
    </>
  )
}
