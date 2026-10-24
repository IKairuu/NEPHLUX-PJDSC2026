import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import clsx from 'clsx'
import Icon, { BrandMark } from '../components/Icon'
import { Chip, LevelChip } from '../components/Chip'
import ThemeToggle from '../components/ThemeToggle'
import { QUESTIONS, RESULT, YES_NO } from '../data/residentQuestions'
import { DEMO_STEPS } from '../data/content'
import { bmiFrom, egfr, level, reasons, score } from '../lib/engine'
import { encode } from '../lib/clinicCode'
import { NAMES, nearest } from '../lib/city'
import { Kpi } from './staff/ui'
import './staff/staff.css'

// Guided demo: Mang Ramon's path through the app on fixed SAMPLE data. It replays copies of the real screens and
// makes no API calls, so nothing is saved or sent and no real records are created.
const STEP_MS = 15000
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// the fictional patient: answers as the resident check takes them, labs as the YAKAP form has them (SI units)
const RAMON = { age: 58, female: false, dm_hx: true, htn_hx: true, bp_med: false, cvd_hx: false, smoker: true, fam_dm: false, w: 72, ht: 165, brgy: 'Bonbon' }
const LABS = { sbp: 148, dbp: 88, hba1c: 7.4, creatUmol: 97, tchol: 5.6, hdl: 1.0, hgb: 128, wbc: 8.1, plt: 240 }
const DIP = { protein: 'Negative', blood: 'Negative', glucose: 'Trace', sg: '1.020' }
const DOCTOR = 'Dr. A. Reyes'
// Step 2U (labs + dipstick) estimate and refer cut for these inputs, from the v8 design's guided demo;
// Step 2U is not scored in the browser
const STEP2U_P = 0.10, STEP2U_REFER = 0.025
const CEB = 'ceb'

const WHO = {
  resident: { icon: 'res', text: 'Resident' },
  doctor: { icon: 'doc', text: 'YAKAP Clinic' },
  cho: { icon: 'cho', text: 'CHO' },
}

function useRamon() {
  return useMemo(() => {
    const a = { ...RAMON, bmi: bmiFrom(RAMON.w, RAMON.ht) }
    const r = score(a, 1)
    const clinics = nearest('Bonbon')
    const pub = clinics.find((c) => c.public)
    const rows = clinics.slice(0, 3)
    if (pub && !rows.some((c) => c.id === pub.id)) rows.push(pub)
    return {
      a, level: level(r.p, 1), code: encode(a, NAMES),
      raised: reasons(r, 8).filter((o) => o.value > 0).slice(0, 4),
      clinics: rows, clinic: clinics[0],
      egfr: Math.round(egfr(LABS.creatUmol / 88.42, RAMON.age, false)),
    }
  }, [])
}

// a resident reason in Bisaya, as the result screen shows it
function cebReason(o, a) {
  const t = RESULT.reasons[o.key]?.ceb
  if (!t) return o.text
  const no = o.key === 'female' ? !a.female : a[o.key] === false
  return (no && t[1]) || t[0]
}

export default function Demo() {
  const nav = useNavigate()
  const R = useRamon()
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef(null)

  const steps = useMemo(() => STEPS(R), [R])
  const s = steps[i], last = i === steps.length - 1

  const exit = useCallback(() => {
    nav('/')
    setTimeout(() => document.getElementById('demo-cta')?.scrollIntoView(), 80)
  }, [nav])
  const go = useCallback((n) => setI(Math.max(0, Math.min(steps.length - 1, n))), [steps.length])

  useEffect(() => {
    document.body.classList.add('in-app', 'demo-on')
    return () => document.body.classList.remove('in-app', 'demo-on')
  }, [])
  useEffect(() => { window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }) }, [i])
  useEffect(() => {
    clearTimeout(timer.current)
    if (!playing) return
    timer.current = setTimeout(() => (last ? setPlaying(false) : setI((n) => n + 1)), STEP_MS)
    return () => clearTimeout(timer.current)
  }, [playing, i, last])
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input,select,textarea')) return
      if (e.key === 'ArrowRight') go(i + 1)
      else if (e.key === 'ArrowLeft') go(i - 1)
      else if (e.key === 'Escape') exit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [i, go, exit])

  const who = WHO[s.role]
  return (
    <div className="app resident">
      <div>
        <div className="top">
          <Link className="brand mr-1.5" to="/"><BrandMark />NEPHLUX</Link>
          <span className="crumb"><span className="hide-sm">Guided demo</span><span aria-hidden="true">/</span><b>{s.screen}</b></span>
          <span className="rolechip"><Icon name={who.icon} />{who.text}</span>
          <button className="btn sm ghost" onClick={exit}>Exit demo</button>
          <ThemeToggle />
        </div>
        <main className="main gdemo-main" id="main" tabIndex={-1}>
          <div key={i} className="gdemo-screen">{s.view}</div>
        </main>
      </div>

      <div className="gdemo" role="region" aria-label="Guided demo">
        <div>
          <div className="dh"><span className="sample">SAMPLE patient</span><span>{s.when}</span><span className="mono">{i + 1} / {steps.length}</span></div>
          <h4>{DEMO_STEPS[i]}</h4>
          <p aria-live="polite">{s.body}</p>
        </div>
        <div className="ctl">
          <button className="icon-btn" aria-label="Previous step" disabled={i === 0} onClick={() => go(i - 1)}><Icon name="back" className="" /></button>
          <button className="btn sm" onClick={() => setPlaying((p) => !p)}><Icon name={playing ? 'pause' : 'play'} />{playing ? 'Pause' : 'Autoplay'}</button>
          <button className="btn sm primary" onClick={() => (last ? exit() : go(i + 1))}>{last ? 'Finish' : <>Next<Icon name="arrow" /></>}</button>
          <button className="icon-btn" aria-label="Exit the guided demo" onClick={exit}><Icon name="x" className="" /></button>
        </div>
        <div className="dots">
          {steps.map((_, j) => (
            <button key={j} type="button" className={clsx(j < i && 'done', j === i && 'on')} aria-label={`Step ${j + 1}: ${DEMO_STEPS[j]}`}
              aria-current={j === i ? 'step' : undefined} onClick={() => go(j)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- the 10 steps

function STEPS(R) {
  return [
    { role: 'resident', screen: 'Awareness check', when: 'Day 0 · Bonbon · Resident',
      body: 'Mang Ramon, a fictional 58-year-old fisherman in Bonbon, opens the resident check on his phone. No account and no labs. He picks Bisaya.',
      view: <QuestionScreen i={0} value="58" /> },
    { role: 'resident', screen: 'Awareness check', when: 'Day 0 · Resident',
      body: 'Diabetes, high blood pressure, smoking, weight and height, and his barangay. Each answer takes one tap. His answers are not stored anywhere.',
      view: <QuestionScreen i={QUESTIONS.length - 1} value="Bonbon" summary /> },
    { role: 'resident', screen: 'Your result', when: 'Day 0 · Resident',
      body: '"Higher chance" is awareness, never a diagnosis. He gets a 9-character code that carries his answers. The code is the only thing he takes to the clinic, and only if he shows it.',
      view: <ResultScreen R={R} /> },
    { role: 'resident', screen: 'Nearest clinics', when: 'Day 0 · Resident',
      body: 'The nearest clinics to Bonbon are listed, with the nearest public one marked. The YAKAP check-up is free at public YAKAP clinics; private ones may charge up to ₱900 a year.',
      view: <ClinicsScreen R={R} /> },
    { role: 'doctor', screen: 'Assessment', when: 'Day 3 · YAKAP clinic',
      body: 'At the YAKAP clinic, staff type his code and confirm each answer with him, measure BP 148/88 and enter the YAKAP labs: HbA1c, creatinine, lipids, blood count and the urine dipstick (negative for protein).',
      view: <AssessScreen R={R} stage={1} /> },
    { role: 'doctor', screen: 'Risk review', when: 'Day 3 · Doctor',
      body: `About 10% with Step 2U (labs + dipstick), well above its 2.5% referral cut: higher risk of albuminuria. His dipstick is negative and his creatinine looks normal (eGFR ${R.egfr}), so neither alone would have flagged him.`,
      view: <RiskScreen R={R} focus="gauge" /> },
    { role: 'doctor', screen: 'Risk review', when: 'Day 3 · Doctor',
      body: 'The top reasons are listed, not hidden: blood pressure, diabetes, HbA1c 7.4%; the negative dipstick lowers the estimate. Every lab is complete; a missing lab would have stopped the estimate.',
      view: <RiskScreen R={R} focus="reasons" /> },
    { role: 'doctor', screen: 'Decision', when: 'Day 3 · Doctor',
      body: 'The model suggests; the doctor decides. She approves a uACR referral, the one test YAKAP does not cover, and prints the slip.',
      view: <DecisionScreen R={R} /> },
    { role: 'doctor', screen: 'Follow-up', when: 'Day 18 · YAKAP clinic',
      body: "Fifteen days later there is no uACR result. Mang Ramon is on the clinic's own Missed list, so the clinic sends him a reminder. The clinic that ordered the test follows it up; nobody else needs his name.",
      view: <FollowupScreen R={R} /> },
    { role: 'cho', screen: 'Overview', when: 'Month-end · City Health Office',
      body: "His uACR came back at 86 mg/g: suspected albuminuria, to be repeated within 3 months. Bonbon's counts update for the City Health Office, which sees reach by barangay, never his name. In testing, the lab model found 32 more cases than the usual rule for the same number of tests.",
      view: <ChoScreen /> },
  ]
}

// ---------------------------------------------------------------- resident screens

function ResidentHead() {
  return (
    <div className="head">
      <div>
        <div className="eyebrow">Resident check · 2 minutes · nothing is saved</div>
        <h1 className="mt-1.5">Should I get my <span className="serif">kidneys</span> checked?</h1>
      </div>
    </div>
  )
}

function LangBar() {
  return (
    <div className="seg lang mb-3.5" role="group" aria-label="Language">
      {[['en', 'English'], ['ceb', 'Bisaya'], ['fil', 'Tagalog']].map(([k, n]) => (
        <button key={k} type="button" className={clsx(k === CEB && 'on', k === CEB && 'hl-ring')} aria-pressed={k === CEB} tabIndex={-1}>{n}</button>
      ))}
    </div>
  )
}

function answerText(q) {
  if (q.k === 'wh') return `${RAMON.w} kg · ${RAMON.ht} cm`
  if (q.k === 'age') return String(RAMON.age)
  if (q.k === 'brgy') return RAMON.brgy
  const opts = typeof q.opts === 'string' ? YES_NO[q.opts] : q.opts
  const o = opts.find(([v]) => (v === '1') === !!RAMON[q.k])
  return o[1][CEB]
}

function QuestionScreen({ i, value, summary }) {
  const q = QUESTIONS[i]
  return (
    <div className="res">
      <ResidentHead />
      <LangBar />
      <div className="card wiz">
        <div className="prog" aria-hidden="true">{QUESTIONS.map((_, j) => <i key={j} className={j <= i ? 'on' : undefined} />)}</div>
        <div className="eyebrow">Question {i + 1} of {QUESTIONS.length}</div>
        <div className="q mt-2">{q.q[CEB]}</div>
        <div className="fil">{q.q.en}</div>
        {q.type === 'brgy'
          ? <select className="in mt-5 hl-ring" value={value} disabled aria-label="Barangay"><option>{value}</option></select>
          : <input className="in mt-5 text-[20px] min-h-[54px] hl-ring" value={value} readOnly aria-label={q.q.en} />}
        <div className="wiz-nav">
          <button type="button" className="btn sm" disabled tabIndex={-1}><Icon name="back" />Back</button>
          <button type="button" className="btn primary" tabIndex={-1}>{i === QUESTIONS.length - 1 ? 'See my result' : 'Next'}<Icon name="arrow" /></button>
        </div>
      </div>
      {summary && (
        <div className="card mt-3.5">
          <div className="eyebrow">His answers so far</div>
          <div className="inputs">
            {QUESTIONS.slice(0, -1).map((qq) => <div key={qq.k}><small>{qq.q[CEB]}</small><b>{answerText(qq)}</b></div>)}
          </div>
        </div>
      )}
    </div>
  )
}

function ResultScreen({ R }) {
  const lv = R.level
  return (
    <div className="res">
      <LangBar />
      <div className="card wiz">
        <div className="eyebrow">{RESULT.title[CEB]}</div>
        <div className={`verdict ${lv}`}>
          <span className="vi"><Icon name={lv === 'higher' ? 'up' : 'check'} className="" /></span>
          <div>
            <LevelChip level={lv} text={RESULT.level[lv][CEB]} />
            <div className="q mt-2 text-[length:clamp(19px,3vw,23px)]">{RESULT.headline[lv][CEB]}</div>
          </div>
        </div>
        <p className="mt-3.5">{RESULT.advice[lv][CEB]}</p>
        <div className="layers">{RESULT.layers[CEB].map(([b, t], j) => <div key={b} className={j === 0 ? 'on' : undefined}><b>{b}</b>{t}</div>)}</div>
        {R.raised.length > 0 && <>
          <h3 className="mt-[18px] mb-2 text-[15px]">{RESULT.raised[CEB]}</h3>
          <div className="flex flex-wrap gap-1.5">{R.raised.map((o) => <span key={o.key} className="chip info"><Icon name="up" />{cebReason(o, R.a)}</span>)}</div>
        </>}
        <div className="codebox hl-ring">
          <div className="eyebrow">{RESULT.codeTitle[CEB]}</div>
          <div className="code">{R.code}</div>
          <p className="text-[13px]">{RESULT.codeText[CEB]}</p>
        </div>
      </div>
    </div>
  )
}

function ClinicsScreen({ R }) {
  return (
    <div className="res">
      <div className="card hl-ring">
        <div className="eyebrow">{RESULT.next[CEB]}</div>
        <h3 className="mt-1.5 text-[20px]">{RESULT.nearestTo[CEB](RAMON.brgy)}</h3>
        <p className="muted text-[13px] mt-1.5">{RESULT.bring[CEB]}</p>
        <div className="clist">
          {R.clinics.map((c, j) => (
            <div key={c.id} className="crow">
              <span className={`pin ${c.public ? 'pub' : 'pri'}`} aria-hidden="true">+</span>
              <span><b>{c.name}</b><small>{c.public ? RESULT.pub[CEB] : RESULT.pri[CEB]} · {c.brgy}{j === 3 ? ` · ${RESULT.nearestPublic[CEB]}` : ''}</small></span>
              <span className="km">~{c.km.toFixed(1)} km</span>
            </div>
          ))}
        </div>
        <div className="legend">
          <span><i className="dot" style={{ background: '#2E9E62' }} />{RESULT.legendPub[CEB]}</span>
          <span><i className="dot" style={{ background: '#C98A1B' }} />{RESULT.legendPri[CEB]}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- clinic screens

function StaffHead({ eyebrow, title, text }) {
  return (
    <div className="head">
      <div><div className="eyebrow">{eyebrow}</div><h1 className="mt-1.5">{title}</h1>{text && <p>{text}</p>}</div>
      <span className="sample">SAMPLE patient</span>
    </div>
  )
}

function Stepper({ on }) {
  const names = ['1 · Patient', '2 · Labs', '3 · Review', '4 · Decision']
  return <div className="stepper">{names.map((n, j) => <span key={n} className={j < on ? 'done' : j === on ? 'on' : undefined}>{n}</span>)}</div>
}

function AssessScreen({ R, stage }) {
  const yn = (v) => (v ? 'yes' : 'no')
  const rows = [
    ['Age', `${RAMON.age} y`], ['Sex', 'Male'], ['Weight', `${RAMON.w} kg`], ['Height', `${RAMON.ht} cm`],
    ['Blood pressure', `${LABS.sbp}/${LABS.dbp}`], ['HbA1c', `${LABS.hba1c}%`], ['Creatinine', `${LABS.creatUmol} µmol/L`],
    ['Total cholesterol', `${LABS.tchol} mmol/L`], ['HDL', `${LABS.hdl.toFixed(1)} mmol/L`], ['Hemoglobin', `${LABS.hgb} g/L`],
    ['WBC', `${LABS.wbc} ×10⁹/L`], ['Platelets', `${LABS.plt} ×10⁹/L`],
  ]
  return (
    <>
      <StaffHead eyebrow={`Assessment · ${R.clinic.name}`} title={<>Who needs the <span className="serif">urine</span> test?</>}
        text="The model estimates the chance of albuminuria (uACR ≥30 mg/g) from the tests YAKAP already covers, including the urine dipstick. The doctor decides." />
      <Stepper on={stage} />
      <div className="cols">
        <div className="card">
          <div className="verify hl-ring">
            <div className="eyebrow">Resident clinic code</div>
            <p className="mt-2 text-[13.5px]"><Chip kind="done" icon="check">Code OK</Chip> <b className="mono">{R.code}</b></p>
            <ul>
              <li>Age {RAMON.age}, male, {RAMON.w} kg, {RAMON.ht} cm, {RAMON.brgy}</li>
              <li>Diabetes {yn(RAMON.dm_hx)} · high BP {yn(RAMON.htn_hx)} · BP medicine {yn(RAMON.bp_med)}</li>
              <li>Heart attack/stroke/HF {yn(RAMON.cvd_hx)} · smokes {yn(RAMON.smoker)} · family diabetes {yn(RAMON.fam_dm)}</li>
            </ul>
            <p className="mt-2 text-[13px]"><Icon name="check" style={{ color: 'var(--low)' }} /> Each answer confirmed with the patient</p>
          </div>
          <div className="eyebrow mt-4">Blood pressure and YAKAP labs · SI units</div>
          <div className="inputs">{rows.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
          <div className="eyebrow mt-4">YAKAP urinalysis · dipstick</div>
          <div className="inputs">{Object.entries({ Protein: DIP.protein, Blood: DIP.blood, Glucose: DIP.glucose, 'Specific gravity': DIP.sg }).map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
        </div>
        <div className="riskcard">
          <div className="eyebrow">Risk review</div>
          <p className="muted mt-2.5">With every lab entered and the answers confirmed, the next step is the estimate.</p>
          <button className="btn primary mt-3.5" tabIndex={-1}><Icon name="flask" />Estimate risk</button>
        </div>
      </div>
    </>
  )
}

function Gauge({ p }) {
  const C = Math.PI * 54, a = Math.min(1, p / 0.6)
  return (
    <svg width="140" height="82" viewBox="0 0 140 82" aria-hidden="true">
      <path d="M16 74 A54 54 0 0 1 124 74" fill="none" style={{ stroke: 'var(--line-2)' }} strokeWidth="12" strokeLinecap="round" />
      <path d="M16 74 A54 54 0 0 1 124 74" fill="none" style={{ stroke: 'var(--high)' }} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(C * a).toFixed(1)} ${C.toFixed(1)}`} />
    </svg>
  )
}

const DOC_REASONS = [
  ['Systolic blood pressure', 'up', 80], ['Diabetes diagnosis', 'up', 79], ['HbA1c (blood sugar control)', 'up', 64],
  ['Urine dipstick protein negative', 'down', 62], ['Smoking', 'up', 30],
]
const COMPLETE = ['Age', 'Weight', 'Height', 'Systolic BP', 'Diastolic BP', 'HbA1c', 'Creatinine', 'Total cholesterol', 'HDL cholesterol', 'Hemoglobin', 'WBC', 'Platelets', 'Dipstick protein']

function RiskCard({ R, focus }) {
  return (
    <div className="riskcard high">
      <div className="flex justify-between items-center gap-2.5 flex-wrap">
        <div className="eyebrow">Chance of albuminuria · uACR ≥30 mg/g</div>
        <LevelChip level="high" />
      </div>
      <div className={clsx('gauge', focus === 'gauge' && 'hl-ring')}>
        <Gauge p={STEP2U_P} />
        <div>
          <div className="pct">{Math.round(STEP2U_P * 100)}%</div>
          <div className="muted mono text-xs mt-1.5">eGFR {R.egfr} · CKD-EPI 2021 · BMI {bmiFrom(RAMON.w, RAMON.ht).toFixed(1)}</div>
        </div>
      </div>
      <p className="mt-3"><b>Suggestion:</b> Refer for a urine albumin-creatinine ratio (uACR) test.</p>
      <div className="note mt-2.5 text-[13px]"><Icon name="flask" /> Step 2U (labs + dipstick) refers at {(STEP2U_REFER * 100).toFixed(1)}% or more. Learned on Korean KNHANES data; not yet validated in Filipino patients.</div>
      <div className={clsx(focus === 'reasons' && 'hl-ring', 'mt-[18px]')}>
        <h3 className="mb-1 text-[15px]">Top reasons</h3>
        {DOC_REASONS.map(([t, d, w]) => (
          <div className="reason" key={t}>
            <span>{t}<span className="dir">{d === 'up' ? '▲ raises the estimate' : '▼ lowers the estimate'}</span></span>
            <div className="rbar" aria-hidden="true"><i className={d} style={{ width: `${w / 2}%` }} /></div>
          </div>
        ))}
      </div>
      <h3 className="mt-[18px] mb-1.5 text-[15px]">Data completeness</h3>
      <div className="complete">{COMPLETE.map((c) => <span key={c}><Icon name="check" />{c}</span>)}</div>
    </div>
  )
}

function RiskScreen({ R, focus }) {
  return (
    <>
      <StaffHead eyebrow={`Risk review · ${R.clinic.name}`} title={<>Risk review · <span className="serif">R.S.</span></>} text={`Bonbon · seen by ${DOCTOR}`} />
      <Stepper on={2} />
      <div className="max-w-[760px]"><RiskCard R={R} focus={focus} /></div>
    </>
  )
}

function DecisionScreen({ R }) {
  return (
    <>
      <StaffHead eyebrow={`Decision · ${R.clinic.name}`} title={<>Approve the <span className="serif">referral</span></>} />
      <Stepper on={4} />
      <div className="cols">
        <div className="card">
          <div className="eyebrow">Your decision</div>
          <div className="flex gap-2.5 items-center flex-wrap mt-2.5">
            <span className="hl-ring rounded-full"><Chip kind="referral" icon="check">Referral approved</Chip></span>
            <span className="muted text-[13px]">by {DOCTOR}</span>
          </div>
          <p className="muted text-[13px] mt-3">The model suggests; the doctor decides and is responsible for it. An override would need a written reason.</p>
        </div>
        <div className="gdemo-slip">
          <p className="tag">SCREENING SUPPORT · NOT A DIAGNOSIS</p>
          <h2>Referral slip: urine albumin-creatinine ratio (uACR) test</h2>
          <p>Seen at {R.clinic.name}, Cagayan de Oro City</p>
          <table>
            <tbody>
              <tr><th>Patient</th><td>R.S., {RAMON.age} y, M, Bonbon</td></tr>
              <tr><th>Resident code</th><td>{R.code} (answers confirmed with the patient)</td></tr>
              <tr><th>BP</th><td>{LABS.sbp}/{LABS.dbp} mmHg</td></tr>
              <tr><th>HbA1c</th><td>{LABS.hba1c}%</td></tr>
              <tr><th>eGFR</th><td>{R.egfr} mL/min/1.73m² (CKD-EPI 2021)</td></tr>
              <tr><th>Urine dipstick</th><td>protein negative · blood negative · glucose trace · SG {DIP.sg}</td></tr>
              <tr><th>Screening estimate</th><td>{Math.round(STEP2U_P * 100)}% chance of uACR ≥30 mg/g (higher risk; Step 2U)</td></tr>
            </tbody>
          </table>
          <p><b>Request:</b> spot uACR, first-morning sample preferred. A single result ≥30 mg/g is suspected albuminuria: repeat within 3 months.</p>
          <p className="mt-4">Doctor: {DOCTOR} &nbsp; PRC No.: ________ &nbsp; Signature: ________</p>
        </div>
      </div>
    </>
  )
}

const MISSED = [
  { id: 'vy', initials: 'V.Y.', brgy: 'Puerto', days: 46, level: 'high' },
  { id: 'ok', initials: 'O.K.', brgy: 'Bugo', days: 43, level: 'high' },
  { id: 'rs', initials: 'R.S.', brgy: 'Bonbon', days: 15, level: 'high', me: true },
]

function FollowupScreen({ R }) {
  const tabs = [['Missed', 3, 'clock'], ['Pending', 7, 'clock'], ['Overrides', 1, 'alert'], ['Recheck', 12, 'dia'], ['Completed', 24, 'check']]
  return (
    <>
      <StaffHead eyebrow={`YAKAP clinic · ${R.clinic.name}`} title={<>Who still needs their <span className="serif">uACR</span>?</>}
        text="Your clinic made these referrals, so your clinic follows them up and records the result when it comes back." />
      <div className="ftabs" role="tablist" aria-label="Follow-up lists">
        {tabs.map(([n, c, ic], j) => <button key={n} role="tab" aria-selected={j === 0} tabIndex={-1}><Icon name={ic} />{n} <b>{c}</b></button>)}
      </div>
      <p className="muted text-[13.5px] mb-3">Referred, but no uACR result after 14 days. Remind them by text or call, using the clinic's usual outreach. Oldest first.</p>
      <div className="plist">
        {MISSED.map((r) => (
          <div key={r.id} className={clsx('prow', r.me && 'hl-ring')}>
            <span className="av">{r.initials}</span>
            <span><b>{r.initials}{r.me && <span className="muted font-normal text-[11px]"> · Mang Ramon</span>}</b><small>{r.brgy} · referred {r.days} days ago</small></span>
            <span className="hide-m"><LevelChip level={r.level} /></span>
            <span className="days">{r.days} days</span>
            <span className="act"><button className="btn sm" tabIndex={-1}><Icon name="flask" />Record uACR</button></span>
          </div>
        ))}
      </div>
    </>
  )
}

// ---------------------------------------------------------------- city screen

const FUNNEL = [['Screened', 480, 'var(--ch2)'], ['Higher risk', 250, 'var(--high)'], ['Referred', 261, 'var(--plum)'], ['Completed', 124, 'var(--low)'], ['uACR ≥30', 35, 'var(--accent)']]

function ChoScreen() {
  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">City Health Office · Cagayan de Oro City</div>
          <h1 className="mt-1.5">Where is screening <span className="serif">reaching</span>?</h1>
          <p>Screening reach by barangay, not how common kidney disease is. No names leave the clinic; cells of 1 to 4 show as "&lt;5".</p>
        </div>
        <span className="sample">SAMPLE records</span>
      </div>
      <div className="kpis">
        <Kpi lead label="Screened with YAKAP labs" value="480" text="0.7 per 1,000 residents" />
        <Kpi label="Came with a resident code" value="168" text="35% of screened" />
        <Kpi label="Higher risk" value="250" text="52% of screened" />
        <Kpi label="Referred for uACR" value="261" text="doctor-approved" />
        <Kpi label="Referrals completed" value="48%" text="124 results in" />
        <Kpi label="uACR ≥30 found" value="35" text="suspected, needs repeat" />
      </div>
      <div className="cards2 mt-3.5">
        <div className="card">
          <div className="eyebrow">Referral funnel · last 90 days</div>
          <div className="fun">
            {FUNNEL.map(([n, v, c]) => (
              <div key={n} className="fr">
                <span>{n}</span>
                <span className="fb"><i style={{ width: `${(100 * v) / 480}%`, background: c }} /></span>
                <span className="num mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card hl-ring">
          <div className="eyebrow">Bonbon · 10,976 residents · SAMPLE</div>
          <div className="prio mt-3.5">
            {[['Screened', '9'], ['Higher risk', '<5'], ['Referred', '<5'], ['uACR ≥30 found', '<5']].map(([k, v]) => (
              <div key={k} className="pr"><span className="n"><Icon name="dot" /></span><span><b>{k}</b><small>counts only, never names</small></span><span className="v">{v}</span></div>
            ))}
          </div>
          <p className="muted text-[13.5px] mt-3.5">Mang Ramon's referral and result are counted here, but the City Health Office never sees who he is. Counts of 1 to 4 show as "&lt;5".</p>
        </div>
      </div>
    </>
  )
}
