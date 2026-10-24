import { useState } from 'react'
import { useNavigate } from 'react-router'
import clsx from 'clsx'
import Icon from '../../../components/Icon'
import { Chip } from '../../../components/Chip'
import { api, barangayList } from '../../../lib/api'
import { useApi } from '../../../hooks/useApi'
import { Head, Live } from '../ui'

const FLAGS = [['dmHx', 'Diabetes'], ['htnHx', 'Hypertension'], ['bpMed', 'BP medicine'], ['cvdHx', 'Heart attack / stroke / HF'], ['smoker', 'Smoker'], ['famDm', 'Family history of diabetes']]
const EMPTY = {
  initials: '', barangayId: '', age: '', female: '0', weightKg: '', heightCm: '',
  dmHx: false, htnHx: false, bpMed: false, cvdHx: false, smoker: false, famDm: false,
  sbp: '', dbp: '', hba1c: '', creat: '', tchol: '', hdl: '', hgb: '', wbc: '', plt: '', dip: '', dipBld: '', dipGlu: '', usg: '',
}
// [field, label, min, max]; ranges are the API's, so the doctor hears about a slip before the server refuses it
const NUMERIC = [
  ['age', 'Age', 20, 100], ['weightKg', 'Weight', 25, 250], ['heightCm', 'Height', 120, 220],
  ['sbp', 'Systolic BP', 60, 260], ['dbp', 'Diastolic BP', 30, 160], ['hba1c', 'HbA1c', 3, 20],
  ['creat', 'Creatinine'], ['tchol', 'Total cholesterol'], ['hdl', 'HDL cholesterol'], ['hgb', 'Hemoglobin'],
  ['wbc', 'WBC', 0.5, 100], ['plt', 'Platelets', 5, 2000],
]
const INITIALS = /^[A-Za-z]\.?(\s?[A-Za-z]\.?){0,3}$/
const UNITS = { SI: { cr: 'µmol/L', ch: 'mmol/L', hb: 'g/L' }, CONVENTIONAL: { cr: 'mg/dL', ch: 'mg/dL', hb: 'g/dL' } }

const filled = (v) => v !== '' && Number.isFinite(+v)
// strip reading -> API dipstick grade
const GRADE = { neg: 'NEG', trace: 'TRACE', 1: 'ONE_PLUS', 2: 'TWO_PLUS', 3: 'THREE_PLUS' }
const STRIP = [['', 'Not done'], ['neg', 'Negative'], ['trace', 'Trace'], ['1', '1+'], ['2', '2+'], ['3', '3+ or more']]

export default function Assess() {
  const navigate = useNavigate()
  const barangays = useApi(() => barangayList())
  const [f, setF] = useState(EMPTY)
  const [units, setUnits] = useState('SI')
  const [code, setCode] = useState({ text: '', loaded: null, confirmed: false, error: '', busy: false })
  const [bad, setBad] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const u = UNITS[units]

  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setBad((b) => b.filter((x) => x !== k)) }
  const field = (k) => ({ id: 'as-' + k, name: k, value: f[k], onChange: (e) => set(k, e.target.value), className: clsx('in', bad.includes(k) && 'bad') })

  async function loadCode() {
    if (!code.text.trim()) return
    setCode((c) => ({ ...c, busy: true, error: '' }))
    try {
      const d = await api.residentCheck.decode(code.text.trim())
      const a = d.answers
      setF((s) => ({
        ...s, age: String(a.age), female: a.female ? '1' : '0', weightKg: String(a.weightKg), heightCm: String(a.heightCm),
        barangayId: d.barangay ? String(d.barangay.id) : s.barangayId,
        dmHx: a.dmHx, htnHx: a.htnHx, bpMed: a.bpMed, cvdHx: a.cvdHx, smoker: a.smoker, famDm: a.famDm,
      }))
      setCode((c) => ({ ...c, busy: false, loaded: d, confirmed: false }))
    } catch (e) {
      setCode((c) => ({ ...c, busy: false, loaded: null, error: e.message }))
    }
  }

  function check() {
    const miss = NUMERIC.filter(([k]) => !filled(f[k])).map(([k]) => k)
    const out = NUMERIC.filter(([k, , lo, hi]) => filled(f[k]) && lo != null && (+f[k] < lo || +f[k] > hi)).map(([k]) => k)
    const other = []
    if (!INITIALS.test(f.initials.trim())) other.push('initials')
    if (!f.barangayId) other.push('barangayId')
    return { miss, out, other }
  }

  async function submit(e) {
    e.preventDefault()
    const { miss, out, other } = check()
    setBad([...other, ...miss, ...out])
    const label = (k) => NUMERIC.find((x) => x[0] === k)[1]
    if (other.includes('initials')) return setMsg('Initials only, like R.S. (never a full name).')
    if (other.includes('barangayId')) return setMsg("Choose the patient's barangay.")
    if (miss.length) return setMsg('Missing: ' + miss.map(label).join(', ') + '. NEPHLUX never treats a missing value as normal.')
    if (out.length) return setMsg('Out of range: ' + out.map(label).join(', ') + '.')
    if (code.loaded && !code.confirmed) return setMsg("Confirm the resident's answers with the patient first (tick the box under the code).")
    if (filled(f.usg) && (+f.usg < 1 || +f.usg > 1.05)) return setMsg('Specific gravity should be between 1.000 and 1.050.')
    setMsg('')
    setBusy(true)
    try {
      const a = await api.assessments.create({
        initials: f.initials.trim(), barangayId: +f.barangayId,
        ...(code.loaded && { residentCode: code.loaded.code, codeConfirmed: true }),
        age: Math.round(+f.age), female: f.female === '1', weightKg: +f.weightKg, heightCm: +f.heightCm,
        dmHx: f.dmHx,
        htnHx: f.htnHx || f.bpMed, // taking BP medicine counts as high BP (the model's BP-medicine input rule)
        bpMed: f.bpMed, cvdHx: f.cvdHx, smoker: f.smoker, famDm: f.famDm,
        sbp: +f.sbp, dbp: +f.dbp, labUnits: units, hba1cPct: +f.hba1c, creatinine: +f.creat,
        totalCholesterol: +f.tchol, hdl: +f.hdl, hemoglobin: +f.hgb, wbc: +f.wbc, platelets: +f.plt,
        // with a dipstick protein result the API scores Step 2U; without one, Step 2
        ...(f.dip && {
          dipProtein: GRADE[f.dip],
          ...(f.dipBld && { dipBlood: GRADE[f.dipBld] }),
          ...(f.dipGlu && { dipGlucose: GRADE[f.dipGlu] }),
          ...(filled(f.usg) && { urineSg: +f.usg }),
        }),
      })
      navigate(`/doctor/assessments/${a.id}`)
    } catch (err) {
      setMsg(err.message)
      setBusy(false)
    }
  }

  const { miss } = check()
  const stepOn = !f.age ? 0 : miss.some((k) => ['hba1c', 'creat', 'tchol', 'hdl', 'hgb', 'wbc', 'plt'].includes(k)) ? 1 : 2

  return (
    <>
      <Head eyebrow="Assessment · YAKAP labs + dipstick" title={<>Who needs the <span className="serif">urine</span> test?</>}
        text="The server estimates the chance of albuminuria (uACR ≥30 mg/g) from the tests YAKAP already covers. You decide.">
        <Live>Scored by the API</Live>
      </Head>
      <div className="stepper">
        {['1 · Patient', '2 · Labs', '3 · Review', '4 · Decision'].map((t, i) => <span key={t} className={i < stepOn ? 'done' : i === stepOn ? 'on' : undefined}>{t}</span>)}
      </div>

      <div className="cols">
        <form className="card" noValidate onSubmit={submit}>
          <div className="verify">
            <div className="eyebrow">Resident clinic code · optional</div>
            <div className="flex gap-2 flex-wrap mt-2">
              <label className="sr-only" htmlFor="as-code">Resident clinic code</label>
              <input id="as-code" className="in mono flex-[1_1_180px] tracking-[.08em]" autoComplete="off" autoCapitalize="characters" spellCheck="false"
                placeholder="e.g. ACS-2YB-A51" value={code.text}
                onChange={(e) => setCode((c) => ({ ...c, text: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadCode() } }} />
              <button className="btn sm" type="button" onClick={loadCode} disabled={code.busy}><Icon name="qr" />{code.busy ? 'Loading…' : 'Load answers'}</button>
            </div>
            <div className="text-[13px] mt-2" role="status">
              {code.error ? <><Chip kind="high" icon="alert">Code not valid</Chip> {code.error}</>
                : code.loaded ? <CodeSummary d={code.loaded} confirmed={code.confirmed} onConfirm={(v) => setCode((c) => ({ ...c, confirmed: v }))} />
                  : <span className="muted">If the patient did the resident check, type their 9-character code. Their answers fill in below; confirm each one with them.</span>}
            </div>
          </div>

          <div className="eyebrow mt-4">Patient</div>
          <div className="fg">
            <div><label className="f" htmlFor="as-initials">Initials (no full names)</label><input {...field('initials')} autoComplete="off" placeholder="e.g. R.S." /></div>
            <div>
              <label className="f" htmlFor="as-barangayId">Barangay</label>
              <select {...field('barangayId')}>
                <option value="">{barangays.error ? 'Could not load barangays' : barangays.data ? 'Choose barangay' : 'Loading…'}</option>
                {barangays.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <Num k="age" label="Age" ph="58" field={field} />
            <div><label className="f" htmlFor="as-female">Sex</label><select {...field('female')}><option value="0">Male</option><option value="1">Female</option></select></div>
            <Num k="weightKg" label="Weight (kg)" ph="72" field={field} />
            <Num k="heightCm" label="Height (cm)" ph="165" field={field} />
          </div>

          <div className="eyebrow mt-[18px]">History</div>
          <div className="toggles">
            {FLAGS.map(([k, label]) => (
              <label className="tg" key={k}><input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} /><span>{label}</span></label>
            ))}
          </div>

          <div className="eyebrow mt-[18px]">Blood pressure · mean of 2–3 readings</div>
          <div className="fg">
            <Num k="sbp" label="Systolic (mmHg)" ph="148" field={field} />
            <Num k="dbp" label="Diastolic (mmHg)" ph="88" field={field} />
          </div>

          <div className="flex justify-between items-center mt-[18px] gap-2.5 flex-wrap">
            <div className="eyebrow">YAKAP labs</div>
            <div className="seg" role="group" aria-label="Lab units">
              {[['SI', 'SI units'], ['CONVENTIONAL', 'mg/dL']].map(([k, label]) => (
                <button key={k} type="button" className={units === k ? 'on' : undefined} aria-pressed={units === k} onClick={() => setUnits(k)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="fg">
            <Num k="hba1c" label="HbA1c (%)" ph="7.4" field={field} />
            <Num k="creat" label={<>Creatinine <span className="mono">{u.cr}</span></>} ph={units === 'SI' ? '97' : '1.1'} field={field} />
            <Num k="tchol" label={<>Total cholesterol <span className="mono">{u.ch}</span></>} ph={units === 'SI' ? '5.6' : '216'} field={field} />
            <Num k="hdl" label={<>HDL <span className="mono">{u.ch}</span></>} ph={units === 'SI' ? '1.0' : '39'} field={field} />
            <Num k="hgb" label={<>Hemoglobin <span className="mono">{u.hb}</span></>} ph={units === 'SI' ? '128' : '12.8'} field={field} />
            <Num k="wbc" label="WBC (×10⁹/L)" ph="8.1" field={field} />
            <Num k="plt" label="Platelets (×10⁹/L)" ph="240" field={field} />
          </div>

          <div className="eyebrow mt-[18px]">YAKAP urinalysis · dipstick</div>
          <div className="fg">
            {[['dip', 'Protein'], ['dipBld', 'Blood'], ['dipGlu', 'Glucose']].map(([k, label]) => (
              <div key={k}>
                <label className="f" htmlFor={'as-' + k}>{label}</label>
                <select {...field(k)} disabled={k !== 'dip' && !f.dip}>
                  {STRIP.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </div>
            ))}
            <Num k="usg" label="Specific gravity" ph="1.015" field={field} />
          </div>
          <p className="muted text-xs mt-1.5">With a protein result, NEPHLUX uses Step 2U (labs plus dipstick), which found 94 more cases than the usual rule on its test. Without one it uses Step 2 (labs only). Blood, glucose and specific gravity are optional. A dipstick protein of 1+ or more means refer for uACR whatever the score.</p>

          <div className="flex gap-2.5 mt-[18px] flex-wrap items-center">
            <button className="btn primary" type="submit" disabled={busy}><Icon name="flask" />{busy ? 'Estimating…' : 'Estimate risk'}</button>
            <span className="text-[13px] text-high" role="alert">{msg}</span>
          </div>
        </form>

        <div className="sticky top-[78px]">
          <div className="riskcard">
            <div className="eyebrow">Risk review</div>
            <p className="muted mt-2.5">Enter the patient and labs, then press Estimate risk. Every field is checked first; nothing missing is assumed to be normal. The estimate is saved to your clinic's queue.</p>
            <div className="complete">
              {NUMERIC.map(([k, label]) => {
                const ok = filled(f[k])
                return <span key={k} className={ok ? undefined : 'miss'}><Icon name={ok ? 'check' : 'alert'} />{label}{ok ? '' : ' · missing'}</span>
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Num({ k, label, ph, field }) {
  return (
    <div>
      <label className="f" htmlFor={'as-' + k}>{label}</label>
      <input {...field(k)} type="number" step="any" inputMode="decimal" placeholder={ph} />
    </div>
  )
}

function CodeSummary({ d, confirmed, onConfirm }) {
  const a = d.answers, yn = (v) => (v ? 'yes' : 'no')
  return (
    <>
      <Chip kind="done" icon="check">Code OK</Chip> <b className="mono">{d.code}</b>
      <ul>
        <li>Age {a.age}, {a.female ? 'female' : 'male'}, {a.weightKg} kg, {a.heightCm} cm, {d.barangay?.name || 'barangay not given'}</li>
        <li>Diabetes {yn(a.dmHx)} · high BP {yn(a.htnHx)} · BP medicine {yn(a.bpMed)}</li>
        <li>Heart attack/stroke/HF {yn(a.cvdHx)} · smokes {yn(a.smoker)} · family diabetes {yn(a.famDm)}</li>
      </ul>
      <label className="tg inline-block mt-2.5">
        <input type="checkbox" checked={confirmed} onChange={(e) => onConfirm(e.target.checked)} />
        <span>I confirmed each answer with the patient</span>
      </label>
    </>
  )
}
