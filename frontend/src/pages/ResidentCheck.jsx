import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import Icon from '../components/Icon'
import { LevelChip } from '../components/Chip'
import ClinicMap from '../components/ClinicMap'
import ResidentShell from '../components/ResidentShell'
import { LANGS, OFFLINE, QUESTIONS, RESULT, UNAVAILABLE, YES_NO } from '../data/residentQuestions'
import { bmiFrom } from '../lib/engine'
import { BARANGAYS } from '../lib/city'
import { api, barangayList } from '../lib/api'
import { useGo } from '../hooks/useGo'

// Answers live in this component's state. POST /resident-check scores them and returns the result and clinic code;
// the API stores none of them.
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const round1 = (x) => Math.round(x * 10) / 10

// the frontend's answer keys -> CreateResidentCheckDto
async function toRequest(a) {
  let barangayId
  if (a.brgy) barangayId = (await barangayList()).find((b) => b.name === a.brgy)?.id
  return {
    age: Math.round(a.age), female: !!a.female, dmHx: !!a.dm_hx, htnHx: !!a.htn_hx, bpMed: !!a.bp_med,
    cvdHx: !!a.cvd_hx, smoker: !!a.smoker, famDm: !!a.fam_dm, weightKg: round1(a.w), heightCm: round1(a.ht),
    ...(barangayId ? { barangayId } : {}),
  }
}

function BarangayOptions({ placeholder = 'Choose barangay' }) {
  return <><option value="">{placeholder}</option>{BARANGAYS.map((b) => <option key={b.name}>{b.name}</option>)}</>
}

export default function ResidentCheck() {
  const [lang, setLang] = useState('en')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null) // ResidentCheckResponseDto
  const [status, setStatus] = useState('idle') // idle | loading | error | done
  const [error, setError] = useState(null) // ApiError
  const done = step >= QUESTIONS.length
  const run = useRef(0)

  async function check(a) {
    const id = ++run.current // a newer request wins
    setStatus('loading')
    setError(null)
    try {
      const res = await api.residentCheck.check(await toRequest(a))
      if (id !== run.current) return
      setResult(res)
      setStatus('done')
    } catch (e) {
      if (id !== run.current) return
      if (e.status >= 500) console.warn('Resident check API:', e.status, e.message) // the setup note, for whoever runs the server
      setError(e)
      setStatus('error')
    }
  }
  function answer(patch) {
    const next = { ...answers, ...patch }
    setAnswers(next)
    setStep((s) => s + 1)
    if (step === QUESTIONS.length - 1) check(next)
  }
  function changeBarangay(brgy) {
    const next = { ...answers, brgy }
    setAnswers(next)
    check(next)
  }
  function clear() {
    run.current++
    setAnswers({})
    setResult(null)
    setStatus('idle')
    setStep(0)
    window.scrollTo(0, 0)
  }

  return (
    <ResidentShell>
      <div className="res">
        <div className="head">
          <div>
            <div className="eyebrow">Resident check · 2 minutes · nothing is saved</div>
            <h1 className="mt-1.5">Should I get my <span className="serif">kidneys</span> checked?</h1>
            <p>An awareness check from 10 questions, with no lab tests. It is not a diagnosis. Your answers are not stored anywhere; at the end you get a short code that carries them to a YAKAP clinic.</p>
          </div>
        </div>
        <div className="seg lang" role="group" aria-label="Language">
          {LANGS.map(([k, name]) => (
            <button key={k} type="button" className={k === lang ? 'on' : undefined} aria-pressed={k === lang} onClick={() => setLang(k)}>{name}</button>
          ))}
        </div>
        <p className="muted text-xs mt-1.5 mb-3.5">Bisaya and Tagalog are draft translations for review by native speakers.</p>
        {done && status === 'done' && result
          ? <Result key={answers.brgy || 'none'} a={answers} res={result} lang={lang} onClear={clear} onBarangay={changeBarangay} />
          : done
          ? <div className="card wiz" aria-live="polite">
              <div className="eyebrow">{RESULT.title[lang]}</div>
              {status === 'error'
                ? <>
                    {/* no connection, or a server-side fault (5xx, e.g. "no active model"): a plain message in the
                        resident's language. Server setup notes are for staff, so they go to the console only. */}
                    {error?.status === 0 || error?.status >= 500
                      ? <div role="alert" className="mt-2.5">
                          <p className="text-high">{(error.status === 0 ? OFFLINE : UNAVAILABLE)[lang]}</p>
                          {lang !== 'en' && <div className="fil">{(error.status === 0 ? OFFLINE : UNAVAILABLE).en}</div>}
                        </div>
                      : <p role="alert" className="mt-2.5 text-high">{error?.message}</p>}
                    <div className="wiz-nav">
                      <button type="button" className="btn sm" onClick={() => { setStatus('idle'); setStep(QUESTIONS.length - 1) }}><Icon name="back" />{RESULT.back[lang]}</button>
                      <button type="button" className="btn primary" onClick={() => check(answers)}>{RESULT.tryAgain[lang]}<Icon name="arrow" /></button>
                    </div>
                  </>
                : <p className="muted mt-2.5">{RESULT.working[lang]}</p>}
            </div>
          : <div className="card wiz" aria-live="polite">
              <Question key={step} i={step} a={answers} lang={lang} onAnswer={answer} onBack={() => setStep((s) => Math.max(0, s - 1))} />
            </div>}
      </div>
    </ResidentShell>
  )
}

function Question({ i, a, lang, onAnswer, onBack }) {
  const q = QUESTIONS[i], last = i === QUESTIONS.length - 1
  const opts = typeof q.opts === 'string' ? YES_NO[q.opts] : q.opts
  const tr = (o) => o[lang] || o.en
  const [age, setAge] = useState(a.age ?? '')
  const [w, setW] = useState(a.w ?? '')
  const [ht, setHt] = useState(a.ht ?? '')
  const [brgy, setBrgy] = useState(a.brgy ?? '')
  const [bad, setBad] = useState({})
  const [msg, setMsg] = useState('')
  const box = useRef(null)

  useEffect(() => { box.current.querySelector('input,select,.opt')?.focus({ preventScroll: true }) }, [])

  function next() {
    if (q.type === 'num') {
      const v = +age
      if (!(v >= 20 && v <= 100)) { setBad({ age: true }); return setMsg('This check is for adults aged 20 to 100. Please enter your age in years.') }
      return onAnswer({ age: v })
    }
    if (q.type === 'wh') {
      const wt = +w, h = +ht, bw = !(wt > 25 && wt < 250), bh = !(h > 120 && h < 220)
      setBad({ w: bw, ht: bh })
      if (bw || bh) return setMsg('Please enter weight in kg (25–250) and height in cm (120–220).')
      return onAnswer({ w: wt, ht: h, bmi: bmiFrom(wt, h) })
    }
    if (q.type === 'brgy') onAnswer({ brgy })
  }
  const onEnter = (e) => { if (e.key === 'Enter') { e.preventDefault(); next() } }

  let body
  if (q.type === 'num') {
    body = <>
      <label className="sr-only" htmlFor="rqAge">Age in years</label>
      <input className={clsx('in mt-5 text-[20px] min-h-[54px]', bad.age && 'bad')} id="rqAge" type="number" inputMode="numeric" min="20" max="100" placeholder="e.g. 52"
        value={age} onChange={(e) => setAge(e.target.value)} onKeyDown={onEnter} />
    </>
  } else if (q.type === 'wh') {
    body = <>
      <div className="fg mt-3.5">
        <div><label className="f" htmlFor="rqW">Weight (kg)</label><input className={clsx('in', bad.w && 'bad')} id="rqW" type="number" inputMode="decimal" placeholder="e.g. 65" value={w} onChange={(e) => setW(e.target.value)} onKeyDown={onEnter} /></div>
        <div><label className="f" htmlFor="rqH">Height (cm)</label><input className={clsx('in', bad.ht && 'bad')} id="rqH" type="number" inputMode="decimal" placeholder="e.g. 158" value={ht} onChange={(e) => setHt(e.target.value)} onKeyDown={onEnter} /></div>
      </div>
      <p className="muted text-[12.5px] mt-2">5 ft = 152 cm · 5 ft 4 in = 163 cm · 1 lb = 0.45 kg</p>
    </>
  } else if (q.type === 'brgy') {
    body = <>
      <label className="sr-only" htmlFor="rqB">Barangay</label>
      <select className="in mt-5" id="rqB" value={brgy} onChange={(e) => setBrgy(e.target.value)}><BarangayOptions /></select>
      <p className="muted text-[12.5px] mt-2">Used only to show the nearest YAKAP clinics.</p>
    </>
  } else {
    body = <div className="opts" role="group" aria-label="Answer">
      {opts.map(([v, label]) => {
        const sel = a[q.k] !== undefined && a[q.k] === (v === '1')
        return (
          <button key={v} type="button" className={clsx('opt', sel && 'sel')} aria-pressed={sel} onClick={() => onAnswer({ [q.k]: v === '1' })}>
            <span>{tr(label)}</span>{lang !== 'en' && <small>{label.en}</small>}
          </button>
        )
      })}
    </div>
  }

  return (
    <div ref={box}>
      <div className="prog" role="progressbar" aria-valuemin={1} aria-valuemax={QUESTIONS.length} aria-valuenow={i + 1} aria-label={`Question ${i + 1} of ${QUESTIONS.length}`}>
        {QUESTIONS.map((_, j) => <i key={j} className={j <= i ? 'on' : undefined} />)}
      </div>
      <div className="eyebrow">Question {i + 1} of {QUESTIONS.length}</div>
      <div className="q mt-2">{tr(q.q)}</div>
      {lang !== 'en' && <div className="fil">{q.q.en}</div>}
      {body}
      <div className="wiz-nav">
        <button type="button" className="btn sm" disabled={i === 0} onClick={onBack}><Icon name="back" />Back</button>
        {!opts && <button type="button" className="btn primary" onClick={next}>{last ? 'See my result' : 'Next'}<Icon name="arrow" /></button>}
      </div>
      <p role="alert" className="text-[13px] mt-2.5 text-high min-h-[18px]">{msg}</p>
    </div>
  )
}

// keeps the bold on the call to action inside the advice text
function Advice({ text, bold }) {
  const i = text.indexOf(bold)
  return i < 0 ? text : <>{text.slice(0, i)}<b>{bold}</b>{text.slice(i + bold.length)}</>
}

// a reason from the API in the chosen language; the server's English text when there is no translation
function reasonText(o, lang) {
  const t = lang !== 'en' && RESULT.reasons[o.key]?.[lang]
  if (!t) return o.text
  const no = o.key === 'female' ? o.text.startsWith('Male') : /^No(t)? /.test(o.text)
  return (no && t[1]) || t[0]
}

function Result({ a, res, lang, onClear, onBarangay }) {
  const go = useGo()
  const lv = res.level === 'HIGHER' ? 'higher' : 'lower', higher = lv === 'higher'
  const T = (k) => RESULT[k][lang] ?? RESULT[k].en
  const fromServer = (k, en) => (lang === 'en' ? en : RESULT[k][lv]?.[lang] ?? en)
  const brgyName = res.barangay?.name || a.brgy
  // the API returns the three nearest clinics, plus the nearest public one when none of those is public;
  // yakapRef matches the map's pin ids
  const rows = res.nearestClinics.map((c) => ({ id: c.yakapRef, name: c.shortName || c.name, public: c.sector === 'PUBLIC', brgy: c.barangayName, km: c.distanceKm }))

  const [mapOpen, setMapOpen] = useState(false)
  const [base, setBase] = useState('satellite')
  const [focus, setFocus] = useState(null)
  const [scrollTick, setScrollTick] = useState(0)
  const mapBox = useRef(null)
  useEffect(() => {
    if (scrollTick) mapBox.current?.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' })
  }, [scrollTick])
  function openMap(id) {
    setMapOpen(true)
    if (id) setFocus({ id })
    setScrollTick((t) => t + 1)
  }

  return (
    <>
      <div className="card wiz" aria-live="polite">
        <div className="eyebrow">{T('title')}</div>
        <div className={`verdict ${lv}`}>
          <span className="vi"><Icon name={higher ? 'up' : 'check'} className="" /></span>
          <div>
            <LevelChip level={lv} text={RESULT.level[lv][lang]} />
            <div className="q mt-2 text-[length:clamp(19px,3vw,23px)]">{fromServer('headline', res.headline)}</div>
          </div>
        </div>
        <p className="mt-3.5"><Advice text={fromServer('advice', res.advice)} bold={T('adviceBold')} /></p>
        <div className="layers" aria-label={T('layersLabel')}>
          {T('layers').map(([b, s], i) => <div key={b} className={i === 0 ? 'on' : undefined}><b>{b}</b>{s}</div>)}
        </div>
        {res.reasons.length > 0 && <>
          <h3 className="mt-[18px] mb-2 text-[15px]">{T('raised')}</h3>
          <div className="flex flex-wrap gap-1.5">{res.reasons.map((o) => <span key={o.key} className="chip info"><Icon name="up" />{reasonText(o, lang)}</span>)}</div>
        </>}
        <div className="codebox">
          <div className="eyebrow">{T('codeTitle')}</div>
          <div className="code" aria-label={'Clinic code ' + res.code.split('').join(' ')}>{res.code}</div>
          <p className="text-[13px]">{T('codeText')}</p>
          <details className="mt-1.5 text-[13px]">
            <summary className="cursor-pointer">{T('codeSummary')}</summary>
            <p className="mt-1.5">{T('codeContains')(a, brgyName)}</p>
          </details>
        </div>
        <p className="muted text-[12.5px] mt-3.5">{lang === 'en' ? res.disclaimer : RESULT.disclaimer[lang]}</p>
        <div className="wiz-nav">
          <button type="button" className="btn sm" onClick={onClear}>{T('clear')}</button>
          <button type="button" className="btn sm" onClick={() => go('nephra')}><Icon name="chat" />{T('askNephra')}</button>
        </div>
      </div>

      <div className="card mt-3.5">
        <div className="eyebrow">{T('next')}</div>
        <h3 className="mt-1.5 text-[20px]">{rows.length ? T('nearestTo')(brgyName) : T('chooseBrgy')}</h3>
        <p className="muted text-[13px] mt-1.5">{T('bring')}</p>
        {!rows.length && (
          <select className="in mt-3" aria-label={T('choosePlaceholder')} value="" onChange={(e) => onBarangay(e.target.value)}>
            <BarangayOptions placeholder={T('choosePlaceholder')} />
          </select>
        )}
        <div className="clist">
          {rows.map((c, i) => (
            <button key={c.id} type="button" className="crow" onClick={() => openMap(c.id)}>
              <span className={`pin ${c.public ? 'pub' : 'pri'}`} aria-hidden="true">+</span>
              <span>
                <b>{c.name}</b>
                <small>{c.public ? T('pub') : T('pri')} · {c.brgy}{i === 3 ? ` · ${T('nearestPublic')}` : ''}</small>
              </span>
              <span className="km">~{c.km.toFixed(1)} km</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center gap-2 flex-wrap mt-3">
          <button type="button" className="btn sm" onClick={() => openMap()}><Icon name="map" />{T('showMap')}</button>
          <div className="seg" role="group" aria-label={T('mapLabel')}>
            {['outline', 'map', 'satellite'].map((k, i) => (
              <button key={k} type="button" className={k === base ? 'on' : undefined} aria-pressed={k === base} onClick={() => setBase(k)}>{T('bases')[i]}</button>
            ))}
          </div>
        </div>
        <div ref={mapBox}>{mapOpen && <ClinicMap from={a.brgy || null} base={base} focus={focus} />}</div>
        <div className="legend">
          <span><i className="dot" style={{ background: '#2E9E62' }} />{T('legendPub')}</span>
          <span><i className="dot" style={{ background: '#C98A1B' }} />{T('legendPri')}</span>
        </div>
        <p className="muted text-xs mt-2">{T('mapNote')}</p>
      </div>
    </>
  )
}
