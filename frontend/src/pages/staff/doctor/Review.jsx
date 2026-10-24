import { useState } from 'react'
import { Link, useParams } from 'react-router'
import clsx from 'clsx'
import Icon from '../../../components/Icon'
import { api } from '../../../lib/api'
import { pct } from '../../../lib/format'
import { useApi } from '../../../hooks/useApi'
import { useUIStore } from '../../../store/useUIStore'
import { DecisionChip, Head, Live, RiskChip, Status, UacrCell, isoDate, levelKey } from '../ui'
import ReferralSlip from './ReferralSlip'

const DIP_POSITIVE = ['1', '2', '3']
// API dipstick grade -> strip reading shown to the doctor
const DIP_SHORT = { NEG: 'neg', TRACE: 'trace', ONE_PLUS: '1', TWO_PLUS: '2', THREE_PLUS: '3' }
const MIN_REASON = 5

function Gauge({ p, level }) {
  const col = level === 'high' ? 'var(--high)' : level === 'moderate' ? 'var(--mod)' : 'var(--low)'
  const C = Math.PI * 54, a = Math.min(1, p / 0.6)
  return (
    <svg width="140" height="82" viewBox="0 0 140 82" aria-hidden="true">
      <path d="M16 74 A54 54 0 0 1 124 74" fill="none" style={{ stroke: 'var(--line-2)' }} strokeWidth="12" strokeLinecap="round" />
      <path d="M16 74 A54 54 0 0 1 124 74" fill="none" style={{ stroke: col }} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(C * a).toFixed(1)} ${C.toFixed(1)}`} />
    </svg>
  )
}

function Reasons({ reasons }) {
  if (!reasons.length) return <p className="muted">No single factor stands out.</p>
  const mx = Math.max(...reasons.map((r) => Math.abs(r.contribution))) || 1
  return reasons.map((r) => {
    const up = r.direction === 'RAISES'
    return (
      <div className="reason" key={r.rank}>
        <span>{r.text}<span className="dir">{up ? '▲ raises the estimate' : '▼ lowers the estimate'}</span></span>
        <div className="rbar" aria-hidden="true"><i className={up ? 'up' : 'down'} style={{ width: `${Math.min(50, (50 * Math.abs(r.contribution)) / mx)}%` }} /></div>
      </div>
    )
  })
}

// GET /assessments/:id, then the decision through POST /referrals
export default function Review() {
  const { id } = useParams()
  const q = useApi(() => api.assessments.get(id), [id])
  const [slipId, setSlipId] = useState(null)
  const a = q.data
  const dip = (a && DIP_SHORT[a.inputs.dipProtein]) || ''

  return (
    <>
      <Head eyebrow="Assessment · risk review" title={a ? <>Risk review · <span className="serif">{a.patient.initials}</span></> : 'Risk review'}
        text={a && `${a.patient.barangay.name} · assessed ${isoDate(a.assessedOn)} at ${a.clinic.name}`}>
        <Live />
      </Head>
      <Status q={q}>
        {a && (
          <div className="cols">
            <div className="grid gap-4">
              <RiskCard a={a} dip={dip} />
              <Decide a={a} dip={dip} onDone={q.reload} onSlip={setSlipId} />
            </div>
            <Inputs a={a} />
          </div>
        )}
      </Status>
      {slipId && <ReferralSlip id={slipId} onClose={() => setSlipId(null)} />}
    </>
  )
}

function RiskCard({ a, dip }) {
  const r = a.risk
  if (!r) return <div className="riskcard"><div className="eyebrow">Risk review</div><p className="muted mt-2.5">This assessment has no risk estimate.</p></div>
  const lv = levelKey(r.riskLevel), dipPos = DIP_POSITIVE.includes(dip)
  return (
    <div className={clsx('riskcard', lv)}>
      <div className="flex justify-between items-center gap-2.5 flex-wrap">
        <div className="eyebrow">Chance of albuminuria · uACR ≥30 mg/g</div>
        <RiskChip level={r.riskLevel} />
      </div>
      <div className="gauge">
        <Gauge p={r.probability} level={lv} />
        <div>
          <div className="pct">{pct(r.probability)}</div>
          <div className="muted mono text-xs mt-1.5">eGFR {Math.round(r.egfr)} · CKD-EPI 2021 · BMI {a.inputs.bmi.toFixed(1)}</div>
        </div>
      </div>
      <p className="mt-3"><b>Suggestion:</b> {dipPos && r.suggestion !== 'REFER'
        ? `Refer for a uACR test: the urinalysis shows protein ${dip}+ (clinical rule beside the model; the model's own suggestion is "${r.suggestionText}").`
        : r.suggestionText}</p>
      {dipPos && (
        <div className="note risk mt-2.5"><Icon name="alert" /> <b>Urinalysis protein {dip}+.</b> Protein on the YAKAP dipstick means refer for uACR whatever the score. This rule applies on top of the score.</div>
      )}
      {a.warnings.map((w) => <div key={w} className="note warn mt-2.5 text-[13px]"><Icon name="alert" /> {w}</div>)}
      <h3 className="mt-[18px] mb-1 text-[15px]">Top reasons</h3>
      <Reasons reasons={r.reasons} />
      <p className="muted text-xs mt-2.5">{r.modelVersion.startsWith('2u')
        ? `Step 2U (model ${r.modelVersion}): logistic regression on YAKAP labs and the urine dipstick, learned on Korean KNHANES 2021–2024 and tested once on 2019–2020.`
        : `Step 2 (model ${r.modelVersion}): logistic regression on YAKAP labs, trained on U.S. NHANES 2011–2016.`} Not yet tested in Filipino patients. Screening support, not a diagnosis.</p>
    </div>
  )
}

// Which buttons are allowed follows the API's decision rules for each suggestion
function Decide({ a, dip, onDone, onSlip }) {
  const notify = useUIStore((s) => s.notify)
  const [mode, setMode] = useState(null) // the decision waiting for a written reason
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const d = a.decision, sug = a.risk?.suggestion

  if (!a.risk) return null
  if (d) {
    return (
      <div className="card">
        <div className="eyebrow">Your decision</div>
        <div className="flex gap-2.5 items-center flex-wrap mt-2.5">
          <DecisionChip decision={d.decision} />
          <span className="muted text-[13px]">Decided {isoDate(d.decidedAt)}</span>
        </div>
        {d.overrideReason && <p className="text-[13.5px] mt-2.5"><b>Reason:</b> {d.overrideReason}</p>}
        {d.recheckDue && <p className="text-[13.5px] mt-2"><b>Recheck YAKAP labs by</b> {isoDate(d.recheckDue)}</p>}
        <p className="text-[13.5px] mt-2"><b>uACR result:</b> <UacrCell value={a.latestUacrMgG} /></p>
        <div className="flex gap-2 flex-wrap mt-3.5">
          {d.decision === 'APPROVED' && <button className="btn sm primary" onClick={() => onSlip(d.id)}><Icon name="print" />Referral slip</button>}
          <Link className="btn sm" to="/doctor/queue">Back to the queue</Link>
        </div>
      </div>
    )
  }

  async function send(decision, why) {
    setBusy(true)
    setMsg('')
    try {
      const res = await api.referrals.create({ assessmentId: a.id, decision, ...(why && { overrideReason: why }) })
      notify(decision === 'NO_REFERRAL' ? 'Decision saved: no referral' : decision === 'OVERRIDDEN' ? 'Override saved' : 'Referral approved')
      onDone()
      // only an approved referral has a slip; an override declines the referral
      if (decision === 'APPROVED') onSlip(res.id)
    } catch (e) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  function withReason(decision) {
    setMode(decision)
    if (!reason && decision === 'APPROVED' && DIP_POSITIVE.includes(dip)) setReason(`Urinalysis protein ${dip}+ on the YAKAP dipstick`)
  }

  function saveReason() {
    if (reason.trim().length < MIN_REASON) return setMsg('Write a reason of at least 5 characters.')
    send(mode, reason.trim())
  }

  return (
    <div className="card">
      <div className="eyebrow">Your decision</div>
      <p className="muted text-[13px] mt-1.5">The model suggests; you decide and are responsible for it. Decisions are final and recorded.</p>
      <div className="decide mt-3">
        {sug === 'REFER' && <>
          <button className="btn primary" disabled={busy} onClick={() => send('APPROVED')}><Icon name="check" />Approve referral</button>
          <button className="btn" disabled={busy} onClick={() => withReason('OVERRIDDEN')}><Icon name="alert" />Override (decline)</button>
        </>}
        {sug === 'CONSIDER_OR_REPEAT' && <>
          <button className="btn primary" disabled={busy} onClick={() => send('APPROVED')}><Icon name="check" />Approve referral</button>
          <button className="btn" disabled={busy} onClick={() => send('NO_REFERRAL')}><Icon name="x" />No referral · recheck in 12 months</button>
        </>}
        {sug === 'ROUTINE' && <>
          <button className="btn primary" disabled={busy} onClick={() => send('NO_REFERRAL')}><Icon name="check" />No referral</button>
          <button className="btn" disabled={busy} onClick={() => withReason('APPROVED')}><Icon name="alert" />Refer anyway</button>
        </>}
      </div>
      {mode && (
        <div className="mt-3">
          <label className="f" htmlFor="rv-reason">{mode === 'OVERRIDDEN' ? 'Reason for not referring (required)' : 'Reason for referring against the suggestion (required)'}</label>
          <textarea id="rv-reason" className="in" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder={mode === 'OVERRIDDEN' ? 'e.g. recent UTI or fever; repeat labs in 2 weeks' : 'e.g. urinalysis protein 1+'} />
          <div className="flex gap-2 mt-2">
            <button className="btn sm primary" disabled={busy} onClick={saveReason}>{mode === 'OVERRIDDEN' ? 'Save override' : 'Approve referral'}</button>
            <button className="btn sm" disabled={busy} onClick={() => { setMode(null); setMsg('') }}>Cancel</button>
          </div>
        </div>
      )}
      <p className="text-[13px] text-high mt-2.5" role="alert">{msg}</p>
    </div>
  )
}

function Inputs({ a }) {
  const i = a.inputs, yn = (v) => (v ? 'Yes' : 'No')
  const rows = [
    ['Age', `${i.age} y`], ['Sex', a.patient.sex === 'F' ? 'Female' : 'Male'], ['Weight', `${i.weightKg} kg`], ['Height', `${i.heightCm} cm`],
    ['Blood pressure', `${i.sbp}/${i.dbp}`], ['HbA1c', `${i.hba1cPct}%`], ['Creatinine', `${i.creatinineMgDl.toFixed(2)} mg/dL`],
    ['Total cholesterol', `${Math.round(i.tcholMgDl)} mg/dL`], ['HDL', `${Math.round(i.hdlMgDl)} mg/dL`], ['Hemoglobin', `${i.hgbGDl.toFixed(1)} g/dL`],
    ['WBC', `${i.wbc} ×10⁹/L`], ['Platelets', `${i.platelets} ×10⁹/L`],
  ]
  const strip = (g) => ({ NEG: 'Negative', TRACE: 'Trace', ONE_PLUS: '1+', TWO_PLUS: '2+', THREE_PLUS: '3+ or more' })[g] || 'Not done'
  const dip = [['Protein', strip(i.dipProtein)], ['Blood', strip(i.dipBlood)], ['Glucose', strip(i.dipGlucose)], ['Specific gravity', i.urineSg ? i.urineSg.toFixed(3) : 'Not done']]
  const hist = [['Diabetes', i.dmHx], ['High BP', i.htnHx], ['BP medicine', i.bpMed], ['Heart attack / stroke / HF', i.cvdHx], ['Smoker', i.smoker], ['Family diabetes', i.famDm]]
  return (
    <div className="card">
      <div className="eyebrow">What was entered</div>
      {a.residentCode && <p className="text-[13px] mt-2"><span className="chip info"><Icon name="qr" />Resident code</span> <b className="mono">{a.residentCode}</b> · answers confirmed with the patient</p>}
      <div className="inputs">{rows.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
      <div className="eyebrow mt-4">History</div>
      <div className="inputs">{hist.map(([k, v]) => <div key={k}><small>{k}</small><b>{yn(v)}</b></div>)}</div>
      <div className="eyebrow mt-4">Urine dipstick</div>
      <div className="inputs">{dip.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
      <p className="muted text-xs mt-3">Labs are stored in conventional units (entered in {i.labUnits === 'SI' ? 'SI units' : 'mg/dL'}). Assessments cannot be edited; enter a new one if something was wrong.</p>
    </div>
  )
}
