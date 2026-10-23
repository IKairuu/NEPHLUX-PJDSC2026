import SectionHead from '../components/SectionHead'
import { EV } from '../data/evidence'

export default function Impact() {
  const slope = EV.calibration_slope_step2.toFixed(2)
  return (
    <section className="sec" id="impact" aria-labelledby="iT">
      <div className="wrap">
        <SectionHead eyebrow="Impact" id="iT"
          title={<>What we <span className="serif">measured</span>, and what we hope for.</>}
          text="Research findings on the left. Potential that still needs to be tested on the right." />
        <div className="impact reveal">
          <div className="col">
            <div className="eyebrow">Measured · U.S. NHANES test set</div>
            <ul>
              <li><b>Better use of YAKAP labs.</b> HbA1c and creatinine carry most of the gain over the questionnaire; the lipid profile adds nothing measurable.</li>
              <li><b>Referral prioritisation.</b> +{EV.extra_cases_step2[0]} cases at the same number of uACR tests as the diabetes-or-high-BP rule.</li>
              <li><b>Calibrated.</b> Calibration slope {slope}, so a 20% estimate means about 20%.</li>
              <li><b>Honest limits.</b> The questionnaire alone failed its pass mark; the model has not been tested on Filipino patients.</li>
            </ul>
          </div>
          <div className="col future">
            <div className="eyebrow">Potential · not yet tested</div>
            <ul>
              <li><b>Earlier screening</b> for adults who never get a urine albumin test today.</li>
              <li><b>Visibility of screening reach</b> by barangay, so outreach goes where coverage is thin.</li>
              <li><b>Local planning</b> of a fixed uACR budget with the slider.</li>
              <li><b>Next steps:</b> test the frozen model on Korean KNHANES data, then on Filipino patients, before any clinical use. Patient outcomes have not been measured.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
