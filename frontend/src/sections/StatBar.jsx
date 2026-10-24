import { STEP2U, CLINIC_COUNT, BARANGAY_COUNT } from '../data/evidence'
import { f3 } from '../lib/format'

// The horizon carries the hero's colour into the dark zone; the stat bar floats across it.
export default function StatBar() {
  return (
    <>
      <div className="horizon" aria-hidden="true" />
      <div className="wrap statwrap">
        <div className="statbar glass">
          <div><b>{f3(STEP2U.auroc.auroc)}</b><span>AUROC, labs + YAKAP dipstick, tested once on {STEP2U.n.toLocaleString('en-US')} Korean adults (KNHANES 2019–2020)</span></div>
          <div><b>+{STEP2U.matched.step2u.extra}</b><span>cases vs "diabetes, high BP or dipstick 1+" at the same number of uACR tests</span></div>
          <div><b>{CLINIC_COUNT}</b><span>YAKAP clinics in Cagayan de Oro, from PhilHealth's list</span></div>
          <div><b>{BARANGAY_COUNT}</b><span>barangays on the City Health Office map</span></div>
        </div>
      </div>
    </>
  )
}
