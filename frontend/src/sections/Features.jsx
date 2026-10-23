import Icon from '../components/Icon'
import { Chip, LevelChip } from '../components/Chip'
import SectionHead from '../components/SectionHead'
import { ROLES } from '../data/content'
import { useGo } from '../hooks/useGo'

// 40 cells of SAMPLE shading for the CHO picture (same seed as the prototype)
const MINIMAP = (() => {
  const out = []
  let s = 3
  for (let i = 0; i < 40; i++) {
    s = (s * 16807) % 2147483647
    const v = s % 10
    out.push(v > 7 ? 'c4' : v > 5 ? 'c3' : v > 2 ? 'c2' : '')
  }
  return out
})()

const FEATURES = [
  { role: 'resident', n: '01', title: 'Two minutes, no labs, nothing saved.', cta: 'Try the check', target: 'resident',
    text: 'A resident answers 10 questions on a phone and gets a plain result: a higher or lower chance, never a diagnosis.',
    ticks: ['English, Bisaya or Tagalog', 'A 9-character clinic code that carries the answers', 'The nearest YAKAP clinics, public ones first'],
    pic: (
      <div className="fpic glass brandpic" aria-hidden="true">
        <div className="lab">Question 3 of 10</div>
        <div className="q">Has a doctor ever told you that you have diabetes?</div>
        <div className="opts2"><span className="on">Yes</span><span>No / not sure</span></div>
        <div className="pbar">{[1, 1, 1, 0, 0, 0, 0, 0, 0, 0].map((on, i) => <i key={i} className={on ? 'on' : undefined} />)}</div>
        <div className="codeline"><span><span className="lab">Clinic code · SAMPLE</span></span><span className="mono">MSJ-5WP-N1Y</span></div>
      </div>
    ) },
  { role: 'doctor', n: '02', title: 'The model suggests. The doctor decides.', cta: 'Open as a doctor', target: 'login:doctor',
    text: 'At the YAKAP clinic, the doctor enters the labs YAKAP already covers. NEPHLUX estimates the chance of albuminuria and shows why.',
    ticks: ['Missing labs stop the estimate; never treated as normal', 'A positive urine dipstick means refer anyway', 'Approve, override with a reason, or decline'],
    pic: (
      <div className="fpic glass" aria-hidden="true">
        <div className="lab">Chance of uACR ≥30 mg/g · SAMPLE</div>
        <div className="gauge2 mt-3"><span className="big">42%</span><span className="bar"><i style={{ left: '88%' }} /></span></div>
        <div className="mt-2.5"><LevelChip level="high" /></div>
        <div className="rlines">
          {[['Systolic blood pressure ▲', 80], ['HbA1c 7.4% ▲', 66], ['Diabetes diagnosis ▲', 48]].map(([t, w]) => (
            <div className="rline" key={t}><span>{t}</span><span className="t2"><i style={{ width: `${w}%` }} /></span></div>
          ))}
        </div>
        <div className="decide">
          <Chip kind="pass" icon="check">Approve referral</Chip>
          <span className="chip follow">Override</span>
          <span className="chip missing">No referral</span>
        </div>
      </div>
    ) },
  { role: 'bhw', n: '03', title: 'Who to visit this week.', cta: 'Open as a BHW', target: 'login:bhw',
    text: 'The barangay health worker sees only her barangay: referrals with no uACR result after 14 days, overrides to confirm, and rechecks.',
    ticks: ['Sorted by days overdue', 'Record the uACR result at the door', 'Sees the risk level, never changes it'],
    pic: (
      <div className="fpic glass" aria-hidden="true">
        <div className="lab">Bonbon · missed referrals · SAMPLE</div>
        <div className="mt-1.5">
          {[['V.Y.', 46], ['O.K.', 43], ['R.S.', 15]].map(([who, d]) => (
            <div className="visit" key={who}>
              <span className="av">{who}</span>
              <span><b>Approved {d} days ago</b><small>No uACR result yet</small></span>
              <Chip kind="missed" icon="clock">{d} d</Chip>
            </div>
          ))}
        </div>
      </div>
    ) },
  { role: 'cho', n: '04', title: 'Where the tests should go next.', cta: 'Open as the CHO', target: 'login:cho',
    text: 'The City Health Office sees counts by barangay, never names: screening reach per 1,000 residents, referrals completed, and a uACR budget.',
    ticks: ['All 80 barangays on one map', 'Counts under 5 hidden', 'A budget slider: with N tests, who goes first'],
    pic: (
      <div className="fpic glass" aria-hidden="true">
        <div className="lab">Screened per 1,000 residents · SAMPLE · not prevalence</div>
        <div className="minimap">{MINIMAP.map((c, i) => <i key={i} className={c || undefined} />)}</div>
        <div className="big3 mt-[18px]">
          <div><b>96.3</b><span>cases per 1,000, model order</span></div>
          <div><b>91.5</b><span>diabetes or BP first</span></div>
          <div><b>58.7</b><span>no order</span></div>
        </div>
        <div className="muted text-xs mt-2">490 uACR tests per 1,000 adults · NHANES test set</div>
      </div>
    ) },
]

export default function Features() {
  const go = useGo()
  return (
    <section className="sec" id="features" aria-labelledby="fT">
      <div className="wrap">
        <SectionHead eyebrow="What NEPHLUX does" id="fT"
          title={<>One pathway, four people, <span className="serif">each with one job.</span></>}
          text="Everything here works in the prototype. Patient records are SAMPLE data; the 42 YAKAP clinics and 80 barangays are real public data." />
        <div className="rows">
          {FEATURES.map((f) => {
            const r = ROLES[f.role]
            return (
              <article className="frow reveal" key={f.role}>
                <div className="ftext">
                  <span className="num">{f.n}</span>
                  <span className="who"><Icon name={r.icon} />{r.name}</span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                  <ul className="ticks">{f.ticks.map((t) => <li key={t}><Icon name="check" />{t}</li>)}</ul>
                  <button className="btn" onClick={() => go(f.target)}>{f.cta}<Icon name="arrow" /></button>
                </div>
                {f.pic}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
