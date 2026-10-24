import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import clsx from 'clsx'
import Icon, { BrandMark } from '../components/Icon'
import { Chip, LevelChip } from '../components/Chip'
import ThemeToggle from '../components/ThemeToggle'
import { QUESTIONS, RESULT } from '../data/residentQuestions'
import { DEMO_STEPS, ROLES } from '../data/content'
import { bmiFrom, egfr, level, reasonText, reasons, score } from '../lib/engine'
import { encode } from '../lib/clinicCode'
import { BARANGAYS, NAMES, nearest } from '../lib/city'
import { escapeHtml as h, pct } from '../lib/format'
import { DecisionChip, Head, Kpi, Sample } from './staff/ui'
import { NAV } from './staff/StaffShell'
import { SlipBody } from './staff/doctor/ReferralSlip'
import CityMap from './staff/cho/CityMap'
import './staff/staff.css'

// Guided demo: Mang Ramon's path through the app on fixed SAMPLE data, following the v8 design's 10 steps.
// Each step shows a copy of the real screen inside its role's shell. It makes no API calls, so nothing is
// saved or sent and no real records are created.
const STEP_MS = 15000
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const noop = () => {}

// the fictional patient: answers as the resident check takes them, labs as the YAKAP form has them (SI units)
const RAMON = { age: 58, female: false, dm_hx: true, htn_hx: true, bp_med: false, cvd_hx: false, smoker: true, fam_dm: false, w: 72, ht: 165, brgy: 'Bonbon' }
const LABS = { sbp: 148, dbp: 88, hba1c: 7.4, creatUmol: 97, tchol: 5.6, hdl: 1.0, hgb: 128, wbc: 8.1, plt: 240 }
const DIP = { protein: 'neg', blood: 'neg', glucose: 'trace', sg: '1.020' }
const DOCTOR = ROLES.doctor.demoName
// Step 2U (labs + dipstick) estimate and refer cut for these inputs, from the v8 design's guided demo;
// Step 2U is not scored in the browser
const STEP2U_P = 0.10, STEP2U_REFER = 0.025
const LANGS = [['en', 'English'], ['ceb', 'Bisaya'], ['fil', 'Tagalog']]
// the API's English result text; the real check shows it as the server sends it, so RESULT has no English copy
const EN = {
  headline: {
    higher: 'Your answers suggest a higher chance of early kidney damage.',
    lower: 'Your answers suggest a lower chance of early kidney damage.',
  },
  advice: {
    higher: 'This is not a diagnosis. It means a doctor should look at your kidneys. Book a YAKAP check-up (free at public clinics) and ask about kidney tests.',
    lower: 'This is not a diagnosis, and a lower chance is not zero. A yearly YAKAP check-up (free at public clinics) is still the best way to catch problems early.',
  },
  disclaimer: 'This check is awareness only and is not a diagnosis. In testing, the questions alone did no better than asking about diabetes and blood pressure, so the YAKAP clinic, with your lab tests, decides who gets the urine test. Built from U.S. survey data; not yet validated in Filipino patients. Nothing you entered was saved.',
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
      clinics: rows, clinic: clinics[0], pub,
      egfr: Math.round(egfr(LABS.creatUmol / 88.42, RAMON.age, false)),
    }
  }, [])
}

// a resident reason in the chosen language, as the result screen shows it
function reasonIn(o, a, lang) {
  const t = lang !== 'en' && RESULT.reasons[o.key]?.[lang]
  if (!t) return reasonText(o, a)
  const no = o.key === 'female' ? !a.female : a[o.key] === false
  return (no && t[1]) || t[0]
}

// step.ring names the part of the screen the step is about; that part gets the highlight ring
const Ring = (ring) => (name) => (ring === name ? 'hl-ring' : undefined)

export default function Demo() {
  const nav = useNavigate()
  const R = useRamon()
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [lang, setLang] = useState('en')
  const timer = useRef(null)

  const steps = useMemo(() => STEPS(R, lang, setLang), [R, lang])
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
  // bring the ringed part into view, as v8's scrollRing does
  useEffect(() => {
    const t = requestAnimationFrame(() => {
      const el = document.querySelector('.gdemo-screen .hl-ring')
      if (el) el.scrollIntoView({ block: s.block || 'center', behavior: reduceMotion() ? 'auto' : 'smooth' })
      else window.scrollTo({ top: 0 })
    })
    return () => cancelAnimationFrame(t)
  }, [i, s.block])
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

  const view = <div key={i} className="gdemo-screen">{s.view}</div>
  return (
    <>
      {s.role === 'resident'
        ? <ResidentFrame screen={s.screen} onExit={exit}>{view}</ResidentFrame>
        : <StaffFrame role={s.role} page={s.page} screen={s.screen} onExit={exit}>{view}</StaffFrame>}

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
    </>
  )
}

// ---------------------------------------------------------------- the two shells

// the resident check's own layout: a top bar only, no account
function ResidentFrame({ screen, onExit, children }) {
  return (
    <div className="app resident">
      <div>
        <div className="top">
          <Link className="brand mr-1.5" to="/"><BrandMark /></Link>
          <span className="crumb"><span className="hide-sm">Guided demo</span><span aria-hidden="true">/</span><b>{screen}</b></span>
          <span className="rolechip"><Icon name="res" />Resident</span>
          <button className="btn sm ghost" onClick={onExit}>Exit demo</button>
          <ThemeToggle />
        </div>
        <main className="main gdemo-main" id="main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  )
}

// a copy of StaffShell signed in as the role's demo account; its links show where the step is but go nowhere
function StaffFrame({ role, page, screen, onExit, children }) {
  const r = ROLES[role]
  const initials = r.demoName.replace(/^Dr\.\s*/, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const link = ([key, label, icon]) => (
    <button key={key} type="button" tabIndex={-1} className={key === page ? 'on' : undefined} aria-current={key === page ? 'page' : undefined}>
      <Icon name={icon} className="" />{label}
    </button>
  )
  return (
    <div className="app">
      <aside className="side" aria-label="Main navigation">
        <Link className="brand" to="/"><BrandMark /></Link>
        <div className="who">
          <span className="av">{initials}</span>
          <span><b>{r.demoName}</b><small>{r.name} · demo</small></span>
        </div>
        <nav className="snav" aria-label={`${r.name} screens`}>{NAV[role].map(link)}</nav>
        <div className="spacer" />
        <div className="snav"><button type="button" onClick={onExit}><Icon name="out" className="" />Exit demo</button></div>
        <div className="sfoot">Guided demo · SAMPLE data, nothing is saved · screening support, not a diagnosis</div>
      </aside>
      <div className="min-w-0">
        <div className="top">
          <span className="crumb"><span className="max-sm:hidden">{r.name}</span><span className="max-sm:hidden" aria-hidden="true">/</span><b>{screen}</b></span>
          <span className="rolechip"><Icon name={r.icon} />{r.short || r.name}</span>
          <button className="btn sm ghost sm:hidden" onClick={onExit}>Exit demo</button>
          <ThemeToggle />
        </div>
        <main className="main gdemo-main" id="main" tabIndex={-1}>{children}</main>
      </div>
      <nav className="tabbar" aria-label="Screens">{NAV[role].map(link)}</nav>
    </div>
  )
}

// ---------------------------------------------------------------- the 10 steps

function STEPS(R, lang, onLang) {
  return [
    { role: 'resident', screen: 'Awareness check', when: 'Day 0 · Bonbon · Resident',
      body: 'Mang Ramon, a fictional 58-year-old fisherman in Bonbon, opens the resident check on his phone. No account and no labs. The check comes in English, Bisaya or Tagalog; switch the language on the screen to see each.',
      view: <QuestionScreen i={0} value="58" lang={lang} onLang={onLang} /> },
    { role: 'resident', screen: 'Awareness check', when: 'Day 0 · Resident',
      body: 'Diabetes, high blood pressure, smoking, weight and height, and his barangay. Each answer takes one tap. His answers are not stored anywhere.',
      view: <QuestionScreen i={QUESTIONS.length - 1} value="Bonbon" lang={lang} onLang={onLang} /> },
    { role: 'resident', screen: 'Your result', when: 'Day 0 · Resident',
      body: '"Higher chance" is awareness, never a diagnosis. He gets a 9-character code that carries his answers. The code is the only thing he takes to the clinic, and only if he shows it.',
      view: <ResultScreen R={R} ring="code" lang={lang} onLang={onLang} /> },
    { role: 'resident', screen: 'Your result', when: 'Day 0 · Resident', block: 'start',
      body: 'The nearest clinics to Bonbon are listed, with the nearest public one marked. The YAKAP check-up is free at public YAKAP clinics; private ones may charge up to ₱900 a year.',
      view: <ResultScreen R={R} ring="finder" lang={lang} onLang={onLang} /> },
    { role: 'doctor', page: 'assess', screen: 'New assessment', when: 'Day 3 · YAKAP clinic · Doctor', block: 'start',
      body: `Signed in as a demo YAKAP doctor. She types his code, confirms each answer with him, measures BP ${LABS.sbp}/${LABS.dbp} and enters the YAKAP labs: HbA1c, creatinine, lipids, blood count and the urine dipstick (negative for protein).`,
      view: <AssessScreen R={R} stage="form" ring="form" /> },
    { role: 'doctor', page: 'assess', screen: 'Risk review', when: 'Day 3 · Doctor', block: 'start',
      body: `About 10% with Step 2U (labs + dipstick), well above its 2.5% referral cut: higher risk of albuminuria. His dipstick is negative and his creatinine looks normal (eGFR ${R.egfr}), so neither alone would have flagged him.`,
      view: <AssessScreen R={R} stage="risk" ring="rcard" /> },
    { role: 'doctor', page: 'assess', screen: 'Risk review', when: 'Day 3 · Doctor',
      body: 'The top reasons are listed, not hidden: blood pressure, diabetes, HbA1c 7.4%; the negative dipstick lowers the estimate. Every lab is complete; a missing lab would have stopped the estimate.',
      view: <AssessScreen R={R} stage="risk" ring="reasons" /> },
    { role: 'doctor', page: 'assess', screen: 'Risk review', when: 'Day 3 · Doctor',
      body: 'The model suggests; the doctor decides. She approves a uACR referral, the one test YAKAP does not cover, and prints the slip.',
      view: <AssessScreen R={R} stage="decided" /> },
    { role: 'doctor', page: 'followup', screen: 'Follow-up', when: 'Day 18 · YAKAP clinic · Follow-up',
      body: "Fifteen days later there is no uACR result. Mang Ramon is on the clinic's own Missed list (highlighted), so the clinic sends him a reminder. The clinic that ordered the test follows it up; nobody else needs his name.",
      view: <FollowupScreen /> },
    { role: 'cho', page: 'overview', screen: 'Overview', when: 'Month-end · City Health Office', block: 'start',
      body: "His uACR came back at 86 mg/g: suspected albuminuria, to be repeated within 3 months. Bonbon's counts update on the city map. The City Health Office sees reach by barangay, never his name. In testing, the lab model found 32 more cases than the usual rule for the same number of tests.",
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

// the language choice works here as in the real check; the demo starts in English
function LangBar({ lang, onLang }) {
  return (
    <div className="seg lang mb-3.5" role="group" aria-label="Language">
      {LANGS.map(([k, n]) => (
        <button key={k} type="button" className={k === lang ? 'on' : undefined} aria-pressed={k === lang} onClick={() => onLang(k)}>{n}</button>
      ))}
    </div>
  )
}

function QuestionScreen({ i, value, lang, onLang }) {
  const q = QUESTIONS[i]
  return (
    <div className="res">
      <ResidentHead />
      <LangBar lang={lang} onLang={onLang} />
      <div className="card wiz hl-ring">
        <div className="prog" aria-hidden="true">{QUESTIONS.map((_, j) => <i key={j} className={j <= i ? 'on' : undefined} />)}</div>
        <div className="eyebrow">Question {i + 1} of {QUESTIONS.length}</div>
        <div className="q mt-2">{q.q[lang] || q.q.en}</div>
        {lang !== 'en' && <div className="fil">{q.q.en}</div>}
        {q.type === 'brgy'
          ? <select className="in mt-5" value={value} onChange={noop} tabIndex={-1} aria-label="Barangay"><option>{value}</option></select>
          : <input className="in mt-5 text-[20px] min-h-[54px]" value={value} readOnly tabIndex={-1} aria-label={q.q.en} />}
        <div className="wiz-nav">
          <button type="button" className="btn sm" disabled={i === 0} tabIndex={-1}><Icon name="back" />Back</button>
          <button type="button" className="btn primary" tabIndex={-1}>{i === QUESTIONS.length - 1 ? 'See my result' : 'Next'}<Icon name="arrow" /></button>
        </div>
      </div>
    </div>
  )
}

// the result with the clinic finder under it, as the real check shows them
function ResultScreen({ R, ring, lang, onLang }) {
  const rg = Ring(ring), lv = R.level
  const T = (k) => RESULT[k][lang] ?? RESULT[k].en
  const advice = lang === 'en' ? EN.advice[lv] : RESULT.advice[lv][lang], bold = T('adviceBold'), b = advice.indexOf(bold)
  return (
    <div className="res">
      <LangBar lang={lang} onLang={onLang} />
      <div className="card wiz">
        <div className="eyebrow">{T('title')}</div>
        <div className={`verdict ${lv}`}>
          <span className="vi"><Icon name={lv === 'higher' ? 'up' : 'check'} className="" /></span>
          <div>
            <LevelChip level={lv} text={RESULT.level[lv][lang]} />
            <div className="q mt-2 text-[length:clamp(19px,3vw,23px)]">{lang === 'en' ? EN.headline[lv] : RESULT.headline[lv][lang]}</div>
          </div>
        </div>
        <p className="mt-3.5">{b < 0 ? advice : <>{advice.slice(0, b)}<b>{bold}</b>{advice.slice(b + bold.length)}</>}</p>
        <div className="layers">{T('layers').map(([t, s], j) => <div key={t} className={j === 0 ? 'on' : undefined}><b>{t}</b>{s}</div>)}</div>
        {R.raised.length > 0 && <>
          <h3 className="mt-[18px] mb-2 text-[15px]">{T('raised')}</h3>
          <div className="flex flex-wrap gap-1.5">{R.raised.map((o) => <span key={o.key} className="chip info"><Icon name="up" />{reasonIn(o, R.a, lang)}</span>)}</div>
        </>}
        <div className={clsx('codebox', rg('code'))}>
          <div className="eyebrow">{T('codeTitle')}</div>
          <div className="code">{R.code}</div>
          <p className="text-[13px]">{T('codeText')}</p>
        </div>
        <p className="muted text-[12.5px] mt-3.5">{lang === 'en' ? EN.disclaimer : RESULT.disclaimer[lang]}</p>
        <div className="wiz-nav">
          <button type="button" className="btn sm" tabIndex={-1}>{T('clear')}</button>
          <button type="button" className="btn sm" tabIndex={-1}><Icon name="chat" />{T('askNephra')}</button>
        </div>
      </div>

      <div className={clsx('card mt-3.5', rg('finder'))}>
        <div className="eyebrow">{T('next')}</div>
        <h3 className="mt-1.5 text-[20px]">{T('nearestTo')(RAMON.brgy)}</h3>
        <p className="muted text-[13px] mt-1.5">{T('bring')}</p>
        <div className="clist">
          {R.clinics.map((c, j) => (
            <div key={c.id} className="crow">
              <span className={`pin ${c.public ? 'pub' : 'pri'}`} aria-hidden="true">+</span>
              <span><b>{c.name}</b><small>{c.public ? T('pub') : T('pri')} · {c.brgy}{j === 3 ? ` · ${T('nearestPublic')}` : ''}</small></span>
              <span className="km">~{c.km.toFixed(1)} km</span>
            </div>
          ))}
        </div>
        <div className="legend">
          <span><i className="dot" style={{ background: '#2E9E62' }} />{T('legendPub')}</span>
          <span><i className="dot" style={{ background: '#C98A1B' }} />{T('legendPri')}</span>
        </div>
        <p className="muted text-xs mt-2">{T('mapNote')}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- clinic screens

const FLAGS = [['dm_hx', 'Diabetes'], ['htn_hx', 'Hypertension'], ['bp_med', 'BP medicine'], ['cvd_hx', 'Heart attack / stroke / HF'], ['smoker', 'Smoker'], ['fam_dm', 'Family history of diabetes']]
const STRIP = { neg: 'Negative', trace: 'Trace' }
const COMPLETE = ['Age', 'Weight', 'Height', 'Systolic BP', 'Diastolic BP', 'HbA1c', 'Creatinine', 'Total cholesterol', 'HDL cholesterol', 'Hemoglobin', 'WBC', 'Platelets']

// one filled, read-only field of the assessment form
function Val({ label, value }) {
  return <div><label className="f">{label}</label><input className="in" value={value} readOnly tabIndex={-1} /></div>
}
function Pick({ label, value }) {
  return <div><label className="f">{label}</label><select className="in" value={value} onChange={noop} tabIndex={-1}><option>{value}</option></select></div>
}

// the New assessment form, filled in for Mang Ramon. stage: form (estimate not run yet), risk, decided
function AssessScreen({ R, stage, ring }) {
  const rg = Ring(ring), yn = (v) => (v ? 'yes' : 'no')
  const on = stage === 'decided' ? 3 : 2
  return (
    <>
      <Head eyebrow="Assessment · YAKAP labs + dipstick" title={<>Who needs the <span className="serif">urine</span> test?</>}
        text="The server estimates the chance of albuminuria (uACR ≥30 mg/g) from the tests YAKAP already covers. You decide.">
        <Sample />
      </Head>
      <div className="stepper">
        {['1 · Patient', '2 · Labs', '3 · Review', '4 · Decision'].map((t, j) => <span key={t} className={j < on ? 'done' : j === on ? 'on' : undefined}>{t}</span>)}
      </div>

      <div className="cols">
        <div className={clsx('card', rg('form'))}>
          <div className="verify">
            <div className="eyebrow">Resident clinic code · optional</div>
            <div className="flex gap-2 flex-wrap mt-2">
              <input className="in mono flex-[1_1_180px] tracking-[.08em]" value={R.code} readOnly tabIndex={-1} aria-label="Resident clinic code" />
              <button className="btn sm" type="button" tabIndex={-1}><Icon name="qr" />Load answers</button>
            </div>
            <div className="text-[13px] mt-2">
              <Chip kind="done" icon="check">Code OK</Chip> <b className="mono">{R.code}</b>
              <ul>
                <li>Age {RAMON.age}, male, {RAMON.w} kg, {RAMON.ht} cm, {RAMON.brgy}</li>
                <li>Diabetes {yn(RAMON.dm_hx)} · high BP {yn(RAMON.htn_hx)} · BP medicine {yn(RAMON.bp_med)}</li>
                <li>Heart attack/stroke/HF {yn(RAMON.cvd_hx)} · smokes {yn(RAMON.smoker)} · family diabetes {yn(RAMON.fam_dm)}</li>
              </ul>
              <label className="tg inline-block mt-2.5"><input type="checkbox" checked readOnly tabIndex={-1} /><span>I confirmed each answer with the patient</span></label>
            </div>
          </div>

          <div className="eyebrow mt-4">Patient</div>
          <div className="fg">
            <Val label="Initials (no full names)" value="R.S." />
            <Pick label="Barangay" value={RAMON.brgy} />
            <Val label="Age" value={RAMON.age} />
            <Pick label="Sex" value="Male" />
            <Val label="Weight (kg)" value={RAMON.w} />
            <Val label="Height (cm)" value={RAMON.ht} />
          </div>

          <div className="eyebrow mt-[18px]">History</div>
          <div className="toggles">
            {FLAGS.map(([k, label]) => <label className="tg" key={k}><input type="checkbox" checked={RAMON[k]} readOnly tabIndex={-1} /><span>{label}</span></label>)}
          </div>

          <div className="eyebrow mt-[18px]">Blood pressure · mean of 2–3 readings</div>
          <div className="fg">
            <Val label="Systolic (mmHg)" value={LABS.sbp} />
            <Val label="Diastolic (mmHg)" value={LABS.dbp} />
          </div>

          <div className="flex justify-between items-center mt-[18px] gap-2.5 flex-wrap">
            <div className="eyebrow">YAKAP labs</div>
            <div className="seg" role="group" aria-label="Lab units">
              <button type="button" className="on" aria-pressed="true" tabIndex={-1}>SI units</button>
              <button type="button" aria-pressed="false" tabIndex={-1}>mg/dL</button>
            </div>
          </div>
          <div className="fg">
            <Val label="HbA1c (%)" value={LABS.hba1c} />
            <Val label={<>Creatinine <span className="mono">µmol/L</span></>} value={LABS.creatUmol} />
            <Val label={<>Total cholesterol <span className="mono">mmol/L</span></>} value={LABS.tchol} />
            <Val label={<>HDL <span className="mono">mmol/L</span></>} value={LABS.hdl.toFixed(1)} />
            <Val label={<>Hemoglobin <span className="mono">g/L</span></>} value={LABS.hgb} />
            <Val label="WBC (×10⁹/L)" value={LABS.wbc} />
            <Val label="Platelets (×10⁹/L)" value={LABS.plt} />
          </div>

          <div className="eyebrow mt-[18px]">YAKAP urinalysis · dipstick</div>
          <div className="fg">
            <Pick label="Protein" value={STRIP[DIP.protein]} />
            <Pick label="Blood" value={STRIP[DIP.blood]} />
            <Pick label="Glucose" value={STRIP[DIP.glucose]} />
            <Val label="Specific gravity" value={DIP.sg} />
          </div>
          <p className="muted text-xs mt-1.5">With a protein result, NEPHLUX uses Step 2U (labs plus dipstick). Without one it uses Step 2 (labs only). A dipstick protein of 1+ or more means refer for uACR whatever the score.</p>

          <div className="flex gap-2.5 mt-[18px] flex-wrap items-center">
            <button className="btn primary" type="button" tabIndex={-1}><Icon name="flask" />Estimate risk</button>
          </div>
        </div>

        <div className="sticky top-[78px] grid gap-4 self-start">
          {stage === 'form' ? (
            <div className="riskcard">
              <div className="eyebrow">Risk review</div>
              <p className="muted mt-2.5">Enter the patient and labs, then press Estimate risk. Every field is checked first; nothing missing is assumed to be normal. The estimate is saved to your clinic's queue.</p>
              <div className="complete">{COMPLETE.map((c) => <span key={c}><Icon name="check" />{c}</span>)}</div>
            </div>
          ) : <>
            <RiskCard R={R} rg={rg} />
            <DecideCard decided={stage === 'decided'} />
          </>}
        </div>
      </div>
      {stage === 'decided' && <SlipModal R={R} />}
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

// [text, raises?, weight]
const DOC_REASONS = [
  ['Systolic blood pressure', true, 80], ['Diabetes diagnosis', true, 79], ['HbA1c (blood sugar control)', true, 64],
  ['Urine dipstick protein negative', false, 62], ['Smoking', true, 30],
]

function RiskCard({ R, rg }) {
  return (
    <div className={clsx('riskcard high', rg('rcard'))}>
      <div className="flex justify-between items-center gap-2.5 flex-wrap">
        <div className="eyebrow">Chance of albuminuria · uACR ≥30 mg/g</div>
        <LevelChip level="high" />
      </div>
      <div className="gauge">
        <Gauge p={STEP2U_P} />
        <div>
          <div className="pct">{pct(STEP2U_P)}</div>
          <div className="muted mono text-xs mt-1.5">eGFR {R.egfr} · CKD-EPI 2021 · BMI {bmiFrom(RAMON.w, RAMON.ht).toFixed(1)}</div>
        </div>
      </div>
      <p className="mt-3"><b>Suggestion:</b> Refer for a urine albumin-creatinine ratio (uACR) test.</p>
      <div className={rg('reasons')}>
        <h3 className="mt-[18px] mb-1 text-[15px]">Top reasons</h3>
        {DOC_REASONS.map(([t, up, w]) => (
          <div className="reason" key={t}>
            <span>{t}<span className="dir">{up ? '▲ raises the estimate' : '▼ lowers the estimate'}</span></span>
            <div className="rbar" aria-hidden="true"><i className={up ? 'up' : 'down'} style={{ width: `${w / 2}%` }} /></div>
          </div>
        ))}
        <h3 className="mt-[18px] mb-1.5 text-[15px]">Data completeness</h3>
        <div className="complete">{[...COMPLETE, 'Dipstick protein'].map((c) => <span key={c}><Icon name="check" />{c}</span>)}</div>
      </div>
      <p className="muted text-xs mt-2.5">Step 2U (labs + dipstick) refers at {(STEP2U_REFER * 100).toFixed(1)}% or more: logistic regression learned on Korean KNHANES 2021–2024 and tested once on 2019–2020. Not yet tested in Filipino patients. Screening support, not a diagnosis.</p>
    </div>
  )
}

function DecideCard({ decided }) {
  if (decided) {
    return (
      <div className="card">
        <div className="eyebrow">Your decision</div>
        <div className="flex gap-2.5 items-center flex-wrap mt-2.5">
          <DecisionChip decision="APPROVED" />
          <span className="muted text-[13px]">Decided by {DOCTOR}</span>
        </div>
        <p className="text-[13.5px] mt-2"><b>uACR result:</b> <span className="muted">waiting for the lab</span></p>
        <div className="flex gap-2 flex-wrap mt-3.5">
          <button className="btn sm primary" type="button" tabIndex={-1}><Icon name="print" />Referral slip</button>
          <button className="btn sm" type="button" tabIndex={-1}>Back to the queue</button>
        </div>
      </div>
    )
  }
  return (
    <div className="card">
      <div className="eyebrow">Your decision</div>
      <p className="muted text-[13px] mt-1.5">The model suggests; you decide and are responsible for it. Decisions are final and recorded.</p>
      <div className="decide mt-3">
        <button className="btn primary" type="button" tabIndex={-1}><Icon name="check" />Approve referral</button>
        <button className="btn" type="button" tabIndex={-1}><Icon name="alert" />Override (decline)</button>
      </div>
    </div>
  )
}

// the printed referral form, filled with the SAMPLE referral, in the same sheet the clinic sees
function SlipModal({ R }) {
  const slip = {
    clinic: { name: R.clinic.name, sector: R.clinic.public ? 'PUBLIC' : 'PRIVATE' }, city: 'Cagayan de Oro City', date: new Date(),
    patient: { initials: 'R.S.', age: RAMON.age, sex: 'MALE', barangay: RAMON.brgy }, residentCode: R.code,
    bloodPressure: { sbp: LABS.sbp, dbp: LABS.dbp }, hba1cPct: LABS.hba1c, creatinineMgDl: LABS.creatUmol / 88.42, egfr: R.egfr,
    probability: STEP2U_P, riskLevel: 'HIGH',
    reasons: DOC_REASONS.slice(0, 4).map(([text, up]) => ({ text, direction: up ? 'RAISES' : 'LOWERS' })),
    request: 'Spot uACR, first-morning sample preferred. A single result ≥30 mg/g is suspected albuminuria: repeat within 3 months.',
    doctorName: DOCTOR,
    returnTo: { clinic: R.clinic.name, nearestPublicClinic: R.clinic.public ? null : R.pub?.name },
    disclaimer: 'Screening support, not a diagnosis. SAMPLE patient from the guided demo.',
  }
  return (
    <div className="modal gdemo-modal" role="dialog" aria-modal="false" aria-label="Referral form">
      <div className="sheet hl-ring">
        <SlipBody s={slip} />
        <div className="bar">
          <button className="btn" type="button" tabIndex={-1}>Close</button>
          <button className="btn primary" type="button" tabIndex={-1}><Icon name="print" />Print / save as PDF</button>
        </div>
      </div>
    </div>
  )
}

const MISSED = [
  { id: 'vy', initials: 'V.Y.', brgy: 'Puerto', days: 46, decided: '2026-09-08' },
  { id: 'ok', initials: 'O.K.', brgy: 'Bugo', days: 43, decided: '2026-09-11' },
  { id: 'rs', initials: 'R.S.', brgy: 'Bonbon', days: 15, decided: '2026-10-09', me: true },
]
const FU_TABS = [['Missed', 3, 'clock'], ['Pending', 7, 'clock'], ['Overrides', 1, 'alert'], ['Recheck', 12, 'dia'], ['Completed', 24, 'check']]

function FollowupScreen() {
  return (
    <>
      <Head eyebrow="YAKAP clinic · follow-up" title={<>Who still needs their <span className="serif">uACR</span>?</>}
        text="Your clinic made these referrals, so your clinic follows them up.">
        <Sample />
      </Head>
      <div className="kpis five fu-kpis">
        {FU_TABS.map(([label, n], j) => <Kpi key={label} lead={j === 0} label={label} value={n} text={j === 0 ? 'need a reminder' : undefined} />)}
      </div>
      <div className="note text-[13px] mt-3.5">
        <Icon name="info" /> When the lab sends a uACR result, record it here. Results are not edited: a wrong entry is followed by a repeat result.
      </div>
      <div className="ftabs" role="tablist" aria-label="Follow-up lists">
        {FU_TABS.map(([n, c, ic], j) => <button key={n} role="tab" aria-selected={j === 0} tabIndex={-1}><Icon name={ic} />{n} <b>{c}</b></button>)}
      </div>
      <p className="muted text-[13.5px] mb-3">Referred, but no uACR result after 14 days. Remind them by text or call, using the clinic's usual outreach. Oldest first; over 60 days is marked.</p>
      <div className="plist" role="tabpanel">
        {MISSED.map((r) => (
          <div key={r.id} className={clsx('prow', r.me && 'hl-ring')}>
            <span className="av">{r.initials}</span>
            <span><b>{r.initials}{r.me && <span className="muted font-normal text-[11px]"> · Mang Ramon</span>}</b><small>{r.brgy} · decided {r.decided}</small></span>
            <span className="hide-m"><LevelChip level="high" /></span>
            <span className="days">{r.days} days</span>
            <span className="act">
              <button className="btn sm" type="button" tabIndex={-1}>Open</button>
              <button className="btn sm" type="button" tabIndex={-1}><Icon name="print" />Slip</button>
              <button className="btn sm" type="button" tabIndex={-1}><Icon name="flask" />Record uACR</button>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

// ---------------------------------------------------------------- city screen

// SAMPLE counts for every barangay, fixed so the map looks the same on each visit; Bonbon carries Mang Ramon
const CITY = (() => {
  const rows = BARANGAYS.filter((b) => b.geometry).map((b, id) => {
    const k = (id * 37 + 11) % 17
    const screened = b.name === 'Bonbon' ? 9 : k < 3 ? 0 : k < 7 ? '<5' : 5 + ((k * 7 + id) % 14)
    const n = typeof screened === 'number' ? screened : 0
    const small = (v) => (v === 0 ? 0 : v < 5 ? '<5' : v)
    return {
      id, name: b.name, pop2020: b.pop2020, boundary: b.geometry,
      stats: { screened, per1k: n ? (1000 * n) / b.pop2020 : null, referred: small(Math.round(n * 0.5)), completed: small(Math.round(n * 0.25)) },
    }
  })
  const v = rows.map((r) => r.stats.per1k).filter(Boolean).sort((a, b) => a - b)
  const br = [0.25, 0.5, 0.75].map((q) => v[Math.floor(q * v.length)] ?? 0)
  return { rows, br, bonbon: rows.find((r) => r.name === 'Bonbon') }
})()
const per1k = (v) => (v == null ? '—' : v < 1 ? v.toFixed(2) : v.toFixed(1))
const cityClass = (b) => {
  const v = b.stats.per1k, [a, m, c] = CITY.br
  return v ? (v < a ? 1 : v < m ? 2 : v < c ? 3 : 4) : typeof b.stats.screened === 'string' ? 1 : 0
}
const cityPopup = (b) => `<b>${h(b.name)}</b> · SAMPLE<br>Population 2020: ${b.pop2020.toLocaleString()}<br>Screened: ${h(String(b.stats.screened))} · referred: ${h(String(b.stats.referred))} · done: ${h(String(b.stats.completed))}`
const FUNNEL = [['Screened', 480, 'var(--ch2)'], ['Higher risk', 250, 'var(--high)'], ['Referred', 261, 'var(--plum)'], ['Completed', 124, 'var(--low)'], ['uACR ≥30', 35, 'var(--accent)']]

function ChoScreen() {
  const top = [...CITY.rows].sort((a, b) => (b.stats.per1k || 0) - (a.stats.per1k || 0)).slice(0, 10)
  if (CITY.bonbon && !top.includes(CITY.bonbon)) top.push(CITY.bonbon)
  return (
    <>
      <Head eyebrow="City Health Office · Cagayan de Oro City" title={<>Where is screening <span className="serif">reaching</span>?</>}
        text={'80 barangays and the YAKAP clinics on PhilHealth\'s list. This shows screening reach, not how common kidney disease is. No names leave the clinic; small counts show as "<5".'}>
        <div className="filters">
          <select className="in" value="90" onChange={noop} tabIndex={-1} aria-label="Period"><option value="90">Last 90 days</option></select>
          <select className="in" value="ALL" onChange={noop} tabIndex={-1} aria-label="Clinic type"><option value="ALL">All YAKAP clinics</option></select>
          <Sample />
        </div>
      </Head>
      <div className="kpis six">
        <Kpi lead label="Screened with YAKAP labs" value="480" text="0.7 per 1,000 residents" />
        <Kpi label="Came with a resident code" value="168" />
        <Kpi label="Higher risk" value="250" />
        <Kpi label="Referred for uACR" value="261" text="doctor-approved" />
        <Kpi label="Referrals completed" value="48%" text="124 results in" />
        <Kpi label="uACR ≥30 found" value="35" text="suspected, needs repeat" />
      </div>

      <div className="cho-grid mt-3.5">
        <div className="card hl-ring">
          <div className="flex justify-between gap-2.5 flex-wrap items-center">
            <div className="seg" role="group" aria-label="Map colour">
              {['Screened per 1,000', 'Referrals completed', 'Population 2020'].map((t, j) => <button key={t} type="button" className={j === 0 ? 'on' : undefined} aria-pressed={j === 0} tabIndex={-1}>{t}</button>)}
            </div>
          </div>
          <CityMap rows={CITY.rows} cls={cityClass} popup={cityPopup} highlight={CITY.bonbon?.id} onPick={noop} base="satellite" />
          <div className="legend">
            <span><b className="text-text font-semibold">Screened per 1,000</b></span>
            <span className="scale" aria-hidden="true">
              <span style={{ border: '1px solid var(--line-2)' }} />{[1, 2, 3, 4].map((k) => <span key={k} style={{ background: `var(--ch${k})` }} />)}
            </span>
            <span>Bonbon outlined</span>
          </div>
          <div className="legend">
            <span><i className="dot" style={{ background: '#2E9E62' }} />Public YAKAP clinic</span>
            <span><i className="dot" style={{ background: '#C98A1B' }} />Private YAKAP clinic</span>
            <span>Pins approximate · Screening reach, not CKD prevalence</span>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">Barangays · screened per 1,000</div>
          <div className="tw mt-2">
            <table className="t">
              <thead><tr><th>Barangay</th><th className="num">Per 1,000</th><th className="num">Screened</th><th className="num">Referred</th><th className="num">Done</th></tr></thead>
              <tbody>
                {top.map((b) => (
                  <tr key={b.id} className={b === CITY.bonbon ? 'hl' : undefined}>
                    <td>{b.name}</td>
                    <td className="num mono">{per1k(b.stats.per1k)}</td>
                    <td className="num">{b.stats.screened}</td>
                    <td className="num">{b.stats.referred}</td>
                    <td className="num">{b.stats.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted text-xs mt-2">Mang Ramon's referral and result are counted in Bonbon's row; the City Health Office never sees who he is.</p>
        </div>
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
        <div className="card">
          <div className="eyebrow">Same tests, more cases</div>
          <p className="mt-2.5">In testing, the lab model found <b>32 more cases</b> than "diabetes or high BP" for the same number of uACR tests.</p>
          <p className="muted text-[13px] mt-2">Counts of 1 to 4 show as "&lt;5" so no one can be picked out in a small barangay.</p>
        </div>
      </div>
    </>
  )
}
