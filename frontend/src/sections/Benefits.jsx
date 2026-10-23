import { useRef } from 'react'
import Icon from '../components/Icon'
import { Chip, LevelChip } from '../components/Chip'
import SectionHead from '../components/SectionHead'
import { BENEFITS } from '../data/content'
import { useUIStore } from '../store/useUIStore'

function Visit({ who, title, sub, chip }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
      <span className="w-9 h-9 rounded-xl bg-surface-2 grid place-items-center text-xs">{who}</span>
      <span><b>{title}</b><br /><small className="muted">{sub}</small></span>
      {chip}
    </div>
  )
}

// small SAMPLE previews of each role's screen
const SCENES = {
  res: (
    <>
      <div className="eyebrow">Your awareness result · SAMPLE</div>
      <LevelChip level="higher" />
      <div className="text-sm">Book a YAKAP check-up (free at public clinics). This is not a diagnosis.</div>
      <div className="mono text-2xl tracking-[.08em]">ACS-2YB-A51</div>
    </>
  ),
  doc: (
    <>
      <div className="eyebrow">Chance of albuminuria · SAMPLE</div>
      <div className="mono text-[40px]">42%</div>
      <LevelChip level="high" />
      {[['HbA1c', 40], ['Systolic BP', 28]].map(([name, w]) => (
        <div className="reason" key={name}>
          <span>{name}<span className="dir">▲ raises</span></span>
          <div className="rbar"><i className="up" style={{ width: `${w}%` }} /></div>
        </div>
      ))}
    </>
  ),
  bhw: (
    <>
      <div className="eyebrow">Bonbon · SAMPLE</div>
      <Visit who="R.S." title="Approved 15 d ago" sub="No uACR result yet" chip={<Chip kind="missed" icon="clock">Missed</Chip>} />
      <Visit who="M.T." title="Moderate risk" sub="Labs again within 12 months" chip={<Chip kind="follow" icon="dia">Recheck</Chip>} />
    </>
  ),
  cho: (
    <>
      <div className="eyebrow">With 490 uACR tests per 1,000 adults</div>
      <div className="big3">
        <div><b>96.3</b><span>cases, model ranking</span></div>
        <div><b>91.5</b><span>diabetes / BP first</span></div>
        <div><b>58.7</b><span>no ranking</span></div>
      </div>
      <div className="muted text-xs">NHANES test set; uACR price assumed ₱600</div>
    </>
  ),
}

export default function Benefits() {
  const tab = useUIStore((s) => s.benefitTab)
  const setTab = useUIStore((s) => s.setBenefitTab)
  const tabs = useRef([])
  const b = BENEFITS[tab]

  function onKey(e, i) {
    const n = BENEFITS.length
    const next = { ArrowDown: 1, ArrowRight: 1, ArrowUp: n - 1, ArrowLeft: n - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const j = (i + next) % n
    setTab(j)
    tabs.current[j].focus()
  }

  return (
    <section className="sec" id="benefits" aria-labelledby="bT">
      <div className="wrap">
        <SectionHead eyebrow="Benefits" id="bT" title={<>What each person <span className="serif">gets.</span></>} />
        <div className="ben reveal">
          <div className="ben-tabs glass" role="tablist" aria-label="Benefits by role">
            {BENEFITS.map((x, i) => (
              <button key={x.role} ref={(el) => { tabs.current[i] = el }} role="tab" id={`bt${i}`} aria-controls="benPanel"
                aria-selected={i === tab} tabIndex={i === tab ? 0 : -1} onClick={() => setTab(i)} onKeyDown={(e) => onKey(e, i)}>
                <Icon name={x.icon} className="" />{x.role}
              </button>
            ))}
          </div>
          <div className="ben-panel" role="tabpanel" id="benPanel" aria-labelledby={`bt${tab}`} aria-live="polite">
            <div>
              <div className="eyebrow">{b.role}</div>
              <p className="q">"{b.q}"</p>
              <ul>{b.items.map((x) => <li key={x}><Icon name="check" />{x}</li>)}</ul>
            </div>
            <div className="ben-scene glass" aria-hidden="true">{SCENES[b.scene]}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
