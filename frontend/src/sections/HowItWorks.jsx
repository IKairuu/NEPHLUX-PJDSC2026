import clsx from 'clsx'
import SectionHead from '../components/SectionHead'
import { STEPS } from '../data/content'
import { EV } from '../data/evidence'

export default function HowItWorks() {
  const pw = EV.pathway_per100
  return (
    <section className="sec" id="how" aria-labelledby="hT">
      <div className="wrap">
        <SectionHead eyebrow="How it works" id="hT"
          title={<>Two steps, and <span className="serif">one doctor</span> deciding.</>}
          text="The numbers are per 100 adults in the held-out U.S. NHANES 2017–2020 test set, using thresholds fixed on training data." />
        <div className="path reveal">
          {STEPS.map(([n, title, text, who, key]) => (
            <div key={n} className={clsx('pstep', key && 'key')}>
              <span className="n">{n}</span><h4>{title}</h4><p>{text}</p><span className="who">{who}</span>
            </div>
          ))}
        </div>
        <div className="funnel reveal">
          <div><b>100</b><span>adults start the check</span></div>
          <div><b>{pw.step1_sent_to_yakap.toFixed(0)}</b><span>invited to a YAKAP check-up</span></div>
          <div><b>{pw.step2_referred_uacr.toFixed(0)}</b><span>referred for a uACR test</span></div>
          <div>
            <b>{pw.step2_cases_found.toFixed(1)}<small className="text-[15px] text-muted"> / {pw.cases.toFixed(1)}</small></b>
            <span>albuminuria cases found</span>
          </div>
        </div>
        <div className="distinct reveal">
          <div className="d"><b>Resident awareness check</b><span>10 questions, no labs. Suggests a YAKAP check-up. Awareness only.</span></div>
          <div className="neq" aria-label="is not the same as">≠</div>
          <div className="d"><b>Lab-based risk estimate</b><span>YAKAP labs + BP + history. Ranks who needs a uACR test most.</span></div>
          <div className="neq" aria-label="is not the same as">≠</div>
          <div className="d"><b>Clinical diagnosis</b><span>Only a doctor, with repeat uACR over 3 months. NEPHLUX never diagnoses.</span></div>
        </div>
      </div>
    </section>
  )
}
