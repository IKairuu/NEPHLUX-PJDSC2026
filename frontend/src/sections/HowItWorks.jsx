import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import Icon from '../components/Icon'
import { Chip, LevelChip } from '../components/Chip'
import SectionHead from '../components/SectionHead'
import { EV } from '../data/evidence'

const STEPS = [
  { title: 'Check', who: 'Resident', icon: 'res', where: 'At home, on a phone · 2 minutes',
    what: 'Answers 10 questions: age, sex, weight, height, diabetes, high blood pressure, BP medicine, smoking, family history, barangay.',
    adds: 'A higher or lower chance, the reasons, and a clinic code. The code is the answers written short.',
    never: 'Diagnoses, or saves or sends the answers.',
    preview: <><div className="lab">Your awareness result · SAMPLE</div><LevelChip level="higher" /><div className="mono text-2xl tracking-[.08em]">MSJ-5WP-N1Y</div></> },
  { title: 'YAKAP check-up', who: 'Clinic', icon: 'pin', where: 'Free at public YAKAP clinics; private ones may charge up to ₱900 a year',
    what: 'Brings the code. Staff check each answer with the resident, measure BP and do the YAKAP labs.',
    adds: 'Loads the code so nothing is typed twice, and lists the 42 YAKAP clinics in the city.',
    never: 'Replaces the YAKAP consult or its lab list.',
    preview: (
      <>
        <div className="lab">YAKAP labs used by the model</div>
        <div className="flex gap-1.5 flex-wrap">{['HbA1c', 'Creatinine', 'Lipids', 'Blood count', 'Measured BP'].map((x) => <span key={x} className="chip info">{x}</span>)}</div>
        <div className="muted text-[12.5px]">With the YAKAP urine dipstick, NEPHLUX uses Step 2U, learned from Korean KNHANES data that has both the dipstick and uACR. Without a dipstick it falls back to the U.S.-trained Step 2.</div>
      </>
    ) },
  { title: 'Risk estimate', who: 'Doctor', icon: 'flask', where: 'In the YAKAP consult · under a minute',
    what: 'The doctor enters the labs in the order of the YAKAP form.',
    adds: 'The chance of albuminuria (uACR ≥30 mg/g), its top reasons, and a check that every lab is there.',
    never: 'Guesses a missing lab or treats it as normal.',
    preview: (
      <>
        <div className="gauge2"><span className="big text-[44px]">10%</span><span className="bar"><i style={{ left: '88%' }} /></span></div>
        <LevelChip level="high" />
        <div className="muted text-[12.5px]">With the dipstick (Step 2U): refer at 2.5% or more. Labs only (Step 2): High is 7.6% or more · moderate 4.5–7.6% · low under 4.5%</div>
      </>
    ) },
  { title: 'Doctor decides', who: 'Doctor', icon: 'check', where: 'Same visit',
    what: 'Approves a uACR referral, overrides with a written reason, or decides no referral.',
    adds: 'A printable referral slip with the reasons, and a record for follow-up.',
    never: 'Refers anyone by itself. The doctor is responsible.',
    preview: (
      <>
        <div className="decide mt-0"><Chip kind="pass" icon="check">Approve referral</Chip><span className="chip follow">Override, with reason</span><span className="chip missing">No referral</span></div>
        <div className="muted text-[12.5px]">uACR is the one test here that YAKAP does not cover.</div>
      </>
    ) },
  { title: 'Follow-up & city view', who: 'YAKAP clinic · CHO', icon: 'cho', where: 'Day 14 onward',
    what: 'The clinic that made the referral reminds anyone with no uACR result after 14 days. The CHO plans tests and outreach by barangay.',
    adds: 'One follow-up list per clinic, and city counts per 1,000 residents with small cells hidden.',
    never: 'Shows names to the city, or claims how common kidney disease is.',
    preview: (
      <>
        <div className="lab">Bonbon · SAMPLE</div>
        <div className="flex gap-1.5 flex-wrap"><Chip kind="missed" icon="clock">Missed · 15 d</Chip><Chip kind="done" icon="check">uACR 86 mg/g recorded</Chip></div>
        <div className="muted text-[12.5px]">Screening reach, not CKD prevalence.</div>
      </>
    ) },
]

function Flowchart() {
  const pw = EV.pathway_per100
  const rows = [
    ['Adults start the check', '', 100],
    ['Invited to a YAKAP check-up', 'step 1, questions only', pw.step1_sent_to_yakap],
    ['Referred for a uACR test', 'step 2, YAKAP labs + doctor', pw.step2_referred_uacr],
    ['Albuminuria cases found', `of ${pw.cases.toFixed(1)} cases in every 100 adults`, pw.step2_cases_found],
  ]
  return (
    <div className="flowchart reveal">
      <div className="fhd"><b>Per 100 adults, held-out test data (NHANES 2017–2020)</b><span>U.S. national survey data. Next step: testing with Philippine YAKAP records.</span></div>
      {rows.map(([label, sub, v], i) => (
        <div key={label} className={clsx('fl', i === 3 && 'found')}>
          <span className="lbl">{label}{sub && <small>{sub}</small>}</span>
          <span className="tr"><i style={{ width: `${v}%` }} /></span>
          <span className="v">{i === 3 ? v.toFixed(1) : v.toFixed(0)}</span>
        </div>
      ))}
    </div>
  )
}

export default function HowItWorks() {
  const [step, setStep] = useState(0)
  const section = useRef(null), panel = useRef(null), tabs = useRef([])
  const s = STEPS[step], last = STEPS.length - 1

  // Auto-advance while the panel is on screen, until the visitor touches or focuses anything in the section.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    let timer
    const io = new IntersectionObserver((entries) => entries.forEach((x) => {
      clearInterval(timer)
      if (x.isIntersecting) timer = setInterval(() => setStep((i) => (i + 1) % STEPS.length), 5200)
    }), { threshold: 0.4 })
    io.observe(panel.current)
    const stop = () => { clearInterval(timer); io.disconnect() }
    const el = section.current
    el.addEventListener('pointerdown', stop)
    el.addEventListener('focusin', stop)
    return () => { stop(); el.removeEventListener('pointerdown', stop); el.removeEventListener('focusin', stop) }
  }, [])

  function onKey(e, i) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const n = (i + (e.key === 'ArrowRight' ? 1 : last)) % STEPS.length
    setStep(n)
    tabs.current[n].focus()
  }

  return (
    <section className="sec" id="how" aria-labelledby="hT" ref={section}>
      <div className="wrap">
        <SectionHead eyebrow="How it works" id="hT"
          title={<>Five steps from a phone <span className="serif">to a urine test.</span></>}
          text="Tap a step to see who does it, what NEPHLUX adds, and what it never does." />
        <div className="steps reveal" role="tablist" aria-label="Steps of the pathway">
          <span className="prog" aria-hidden="true" style={{ width: `${(80 * step) / last}%` }} />
          {STEPS.map((x, i) => (
            <button key={x.title} ref={(el) => { tabs.current[i] = el }} role="tab" id={`hs${i}`} aria-controls="howPanel"
              aria-selected={i === step} tabIndex={i === step ? 0 : -1} className={i < step ? 'done' : undefined}
              onClick={() => setStep(i)} onKeyDown={(e) => onKey(e, i)}>
              <span className="node"><Icon name={x.icon} className="" /></span><b>{x.title}</b><small>{x.who}</small>
            </button>
          ))}
        </div>
        <div className="steppanel glass reveal" id="howPanel" role="tabpanel" aria-live="polite" aria-labelledby={`hs${step}`} ref={panel}>
          {/* keyed by step so each change replays a short cross-fade */}
          <div className="swap" key={`a${step}`}><h4>What happens</h4><p>{s.what}</p></div>
          <div className="swap" key={`b${step}`}><h4>What NEPHLUX adds</h4><p>{s.adds}</p></div>
          <div className="swap" key={`c${step}`}><h4>What it never does</h4><p className="no">{s.never}</p></div>
          <div className="pv swap" key={`d${step}`} aria-hidden="true">{s.preview}</div>
          <div className="meta">
            <span><b className="text-text">Step {step + 1} of {STEPS.length} · {s.who}</b> · {s.where}</span>
            <span className="flex items-center gap-1.5">
              <button className="btn xs" disabled={step === 0} onClick={() => setStep(step - 1)}><Icon name="back" />Back</button>
              <button className="btn xs" disabled={step === last} onClick={() => setStep(step + 1)}>Next<Icon name="arrow" /></button>
            </span>
          </div>
        </div>
        <Flowchart />
        <div className="distinct reveal">
          <div><b>Resident check</b><span>10 questions, no labs. Suggests a YAKAP check-up. Awareness only.</span></div>
          <div className="neq" aria-label="is not the same as">≠</div>
          <div><b>Lab-based estimate</b><span>YAKAP labs, BP and history. Ranks who needs a uACR test most.</span></div>
          <div className="neq" aria-label="is not the same as">≠</div>
          <div><b>Diagnosis</b><span>Only a doctor, with repeat uACR over 3 months. NEPHLUX never diagnoses.</span></div>
        </div>
      </div>
    </section>
  )
}
