import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import NephraFace from '../components/NephraFace'
import SectionHead from '../components/SectionHead'
import { EMOTIONS, forAnswer } from '../lib/nephraFace'

// The landing chat offers five fixed questions, so it carries their checked answers from the Nephra bank.
// TODO: swap for the full Nephra engine (free-text matching and safety filters) when the chat panel is ported.
const GREETING = "Hi, I'm Nephra. Ask me how NEPHLUX works, what YAKAP covers, or what a uACR test is. I can't diagnose or read your results."
const QUESTIONS = [
  { q: 'What is NEPHLUX?', id: 'what_is_nephlux', scope: 'in',
    a: 'NEPHLUX helps Cagayan de Oro decide who should get a urine albumin test first. It reads lab tests that YAKAP already pays for and ranks who most needs that urine test, so a doctor can decide.\n\nIt supports doctors. It does not give a diagnosis.' },
  { q: 'How do I use this app?', id: 'how_to_use', scope: 'in',
    a: 'Pick your role from the Access Portal. Residents can start the 2-minute check right away with no account; YAKAP clinics and the CHO sign in with their staff accounts.' },
  { q: 'Is this a diagnosis?', id: 'is_it_diagnosis', scope: 'in',
    a: 'No. NEPHLUX is not a diagnosis: it only helps decide who should see a doctor and who should get a urine albumin test first. Only that urine test, ordered and read by a doctor, can show kidney damage.' },
  { q: 'Is YAKAP free?', id: 'yakap_cost', scope: 'in',
    a: 'YAKAP services are free at public YAKAP clinics. A private YAKAP clinic may charge up to ₱900 a year in total, and after that the covered services for the year are at no extra cost.' },
  { q: 'My creatinine is 110. Is that bad?', id: 'refuse_values', scope: 'medical',
    a: "I can't read or judge your own numbers or results. A doctor reads them together with your history and other tests, so please show them to your YAKAP doctor.\n\nIf you feel very unwell, go to an emergency room." },
]
const CAN = ['Explain the steps, the words and where to go next', 'Show the difference between screening and diagnosis', 'Help staff find features on their screens', 'Answer in English, Bisaya or Tagalog']
const NEVER = ['Diagnoses, or reads your own lab results', 'Changes a risk score or approves a referral', 'Calculates risk scores, eGFR or costs, or advises on medicines', 'Stores what you type: questions go to the AI model to be answered, then are discarded']

export default function Nephra() {
  const [emotion, setEmotion] = useState('happy')
  const [log, setLog] = useState([{ who: 'ai', text: GREETING }])
  const logRef = useRef(null), timer = useRef(null)
  const mood = EMOTIONS.find((e) => e.id === emotion)

  useEffect(() => { logRef.current.scrollTop = logRef.current.scrollHeight }, [log])
  useEffect(() => () => clearTimeout(timer.current), [])

  function ask(item) {
    clearTimeout(timer.current)
    setLog((l) => [...l, { who: 'me', text: item.q }])
    setEmotion('thinking')
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    timer.current = setTimeout(() => {
      setLog((l) => [...l, { who: 'ai', text: item.a }])
      setEmotion(forAnswer(item))
    }, reduce ? 0 : 600)
  }

  return (
    <section className="sec" id="nephra" aria-labelledby="nT">
      <div className="wrap">
        <SectionHead eyebrow="Meet Nephra" id="nT"
          title={<>Your guide to the app, <span className="serif">never a doctor.</span></>}
          text="Nephra is an AI help assistant for questions about NEPHLUX, YAKAP and the uACR test. It only rewords answers our team has checked and never reads your results." />
        <div className="nstage reveal">
          <div className="npod glass">
            <div className="who"><NephraFace emotion={emotion} size={260} title={`Nephra, ${mood.name.toLowerCase()}`} /></div>
            <div className="mood"><b>{mood.name}</b> · {mood.use}</div>
            <div className="emos" role="group" aria-label="Nephra's moods">
              {EMOTIONS.map((e) => (
                <button key={e.id} type="button" aria-pressed={e.id === emotion} onClick={() => { clearTimeout(timer.current); setEmotion(e.id) }}>{e.name}</button>
              ))}
            </div>
          </div>
          <div className="nchat glass">
            <div className="hd">
              <span className="mini"><NephraFace emotion="happy" size={42} /></span>
              <div><b>Nephra</b><div className="muted text-xs">AI assistant · rewords checked answers, not for diagnosis</div></div>
            </div>
            <div className="log" ref={logRef} aria-live="polite">
              {log.map((m, i) => <div key={i} className={`bub ${m.who}`}>{m.text}</div>)}
            </div>
            <div className="nchips">
              {QUESTIONS.map((item) => <button key={item.id} type="button" onClick={() => ask(item)}>{item.q}</button>)}
            </div>
          </div>
          <div className="canrow col-span-full">
            <div>
              <div className="eyebrow text-low">Nephra can</div>
              {CAN.map((t) => <div className="row" key={t}><Icon name="check" style={{ color: 'var(--low)' }} />{t}</div>)}
            </div>
            <div>
              <div className="eyebrow text-high">Nephra never</div>
              {NEVER.map((t) => <div className="row" key={t}><Icon name="x" style={{ color: 'var(--high)' }} />{t}</div>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
