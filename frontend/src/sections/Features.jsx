import clsx from 'clsx'
import Icon from '../components/Icon'
import { Chip, LevelChip } from '../components/Chip'
import SectionHead from '../components/SectionHead'

const ITEMS = [
  { cls: 'w7 brandbox', icon: 'res', tag: 'Resident screening', title: 'Two minutes, no labs, nothing saved.',
    items: ['Ten questions in English, Bisaya or Tagalog', 'A plain result: higher or lower chance, never a diagnosis', 'A 9-character clinic code that carries the answers', 'The nearest YAKAP clinics, public ones first'],
    preview: (
      <>
        <div className="eyebrow text-white/70">Question 3 of 10</div>
        <div className="font-semibold mt-1.5">Has a doctor ever told you that you have diabetes?</div>
        <div className="mini-q"><span className="on">Yes</span><span>No / not sure</span></div>
        <div className="mbar mt-3"><i style={{ width: '30%' }} /></div>
      </>
    ) },
  { cls: 'w5', icon: 'doc', tag: 'YAKAP clinic assessment', title: 'The model suggests. The doctor decides.',
    items: ['Labs entered in the order of the YAKAP form', 'Risk with its top reasons, and missing data flagged', 'Approve, override with a reason, or decline', 'Printable uACR referral slip'],
    preview: (
      <>
        <div className="flex justify-between items-center"><span className="mono text-[30px] tracking-[-.04em]">42%</span><LevelChip level="high" /></div>
        <div className="muted text-xs mt-1">SAMPLE · chance of uACR ≥30 mg/g</div>
      </>
    ) },
  { cls: 'w5', icon: 'bhw', tag: 'Referral follow-up', title: 'Who to visit this week.',
    items: ['Missed referrals after 14 days', 'Doctor overrides to confirm', 'Moderate-risk rechecks in 12 months', 'Record the uACR result when it comes back'],
    preview: (
      <div className="flex gap-2 flex-wrap">
        <Chip kind="missed" icon="clock">Missed · 21 d</Chip>
        <Chip kind="follow" icon="alert">Override</Chip>
        <Chip kind="done" icon="check">Completed</Chip>
      </div>
    ) },
  { cls: 'w7', icon: 'cho', tag: 'City Health Office analytics', title: 'Where tests should go next.',
    items: ['Screening reach per 1,000 residents in 80 barangays', 'Referral and completion counts, small cells hidden', 'A uACR budget slider: with N tests, who goes first', 'Large-population, low-reach barangays for outreach'],
    preview: (
      <>
        {[['Barangay A', 82, '5.5'], ['Barangay B', 48, '3.2'], ['Barangay C', 16, '1.1']].map(([name, w, v]) => (
          <div className="hb" key={name}><span>{name}</span><span className="tr"><i style={{ width: `${w}%` }} /></span><span className="num">{v}</span></div>
        ))}
        <div className="muted text-[11.5px] mt-1">SAMPLE · screened per 1,000 · not prevalence</div>
      </>
    ) },
]

export default function Features() {
  return (
    <section className="sec" id="features" aria-labelledby="fT">
      <div className="wrap">
        <SectionHead eyebrow="Features" id="fT"
          title={<>One pathway, <span className="serif">four</span> people, each with one job.</>}
          text="Everything below works in this prototype. Records are SAMPLE data; the 42 YAKAP clinics come from PhilHealth's list." />
        <div className="bento">
          {ITEMS.map((b) => (
            <article key={b.tag} className={clsx('bx reveal', b.cls)}>
              <span className="tag"><Icon name={b.icon} />{b.tag}</span>
              <h3>{b.title}</h3>
              <ul>{b.items.map((x) => <li key={x}>{x}</li>)}</ul>
              <div className="prev" aria-hidden="true">{b.preview}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
