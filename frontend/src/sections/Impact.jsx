import SectionHead from '../components/SectionHead'
import { EV, STEP2U as U } from '../data/evidence'
import { pct } from '../lib/format'

export default function Impact() {
  const m = U.matched
  return (
    <section className="sec" id="impact" aria-labelledby="iT">
      <div className="wrap">
        <SectionHead eyebrow="Impact" id="iT"
          title={<>What we measured, <span className="serif">and what we hope for.</span></>}
          text="Research findings on the left. Potential that still has to be tested on the right." />
        <div className="impact reveal">
          <div className="col">
            <div className="eyebrow">Measured · Korean KNHANES and U.S. NHANES test sets</div>
            <ul>
              <li><b>Better use of YAKAP labs.</b> HbA1c and creatinine carry most of the gain over the questionnaire; the lipid profile adds nothing measurable.</li>
              <li><b>Labs only (Step 2, U.S. test).</b> +{EV.extra_cases_step2[0]} cases at the same number of uACR tests as the diabetes-or-high-BP rule.</li>
              <li><b>Calibrated.</b> Step 2U calibration slope {U.calibration.slope.toFixed(2)} on Korean adults, so a 10% estimate means about 10%.</li>
              <li><b>With the dipstick (Step 2U).</b> On {U.n.toLocaleString('en-US')} Korean adults it found {m.step2u.cases_found} of {U.cases} cases vs {m.comparator.cases_found} for "diabetes, high BP or dipstick 1+", at the same {pct(U.comparator_share)} referred.</li>
              <li><b>Honest limits.</b> The questionnaire alone failed its pass mark; without the dipstick, Step 2 was not clearly better than the plain rule on Korean data; no model has been tested on Filipino patients.</li>
            </ul>
          </div>
          <div className="col future">
            <div className="eyebrow">Potential · not yet tested</div>
            <ul>
              <li><b>Earlier screening</b> for adults who never get a urine albumin test today.</li>
              <li><b>Visibility of screening reach</b> by barangay, so outreach goes where coverage is thin.</li>
              <li><b>Local planning</b> of a fixed uACR budget with the slider.</li>
              <li><b>Next steps:</b> test the frozen models on Filipino patients (YAKAP records in Cagayan de Oro, about 2,800–4,400 adults for Step 2U) before any clinical use. Patient outcomes have not been measured.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
