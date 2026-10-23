import Icon from '../components/Icon'
import { useGo } from '../hooks/useGo'

const CAN = ['Explains the steps, the words and where to go next', 'Shows the difference between screening and diagnosis', 'Helps staff find features on their screens']
const CANT = ['Never diagnoses or reads your own lab results', 'Never changes a risk score or approves a referral', 'Sends medical questions to a YAKAP doctor']

export default function Nephra() {
  const navigate = useGo()
  return (
    <section className="sec" id="nephra" aria-labelledby="nT">
      <div className="wrap neph">
        <div className="reveal">
          <div className="eyebrow">Nephra · proposed help assistant</div>
          <h2 id="nT" className="text-[length:clamp(30px,4vw,50px)] tracking-[-.04em] leading-[1.04] mt-2.5">Questions about the app, <span className="serif">answered</span>.</h2>
          <p className="muted mt-3.5 max-w-[520px]">Nephra explains NEPHLUX, YAKAP, the uACR test and what a result means. It is a proposed feature, separate from the risk model, and it is not part of the research paper. In this prototype it gives preset answers. It is not a live AI.</p>
          <div className="can">{CAN.map((t) => <div className="row" key={t}><Icon name="check" className="" style={{ color: 'var(--low)' }} />{t}</div>)}</div>
          <div className="cant">{CANT.map((t) => <div className="row" key={t}><Icon name="x" className="" style={{ color: 'var(--high)' }} />{t}</div>)}</div>
          <button className="btn mt-[22px]" onClick={() => navigate('nephra')}><Icon name="chat" />Ask Nephra</button>
        </div>
        <div className="chatmock reveal" aria-label="Example conversation">
          <div className="flex gap-2.5 items-center">
            <span className="nfab static p-1 shadow-none"><span className="orb" /></span>
            <div><b className="text-sm">Nephra</b><div className="muted text-xs">Demo assistant · preset answers</div></div>
          </div>
          <div className="bub me">Is the awareness check a diagnosis?</div>
          <div className="bub ai">No. The 10 questions only suggest whether to get a YAKAP check-up. Only a doctor, with a urine albumin test repeated over 3 months, can confirm kidney damage.</div>
          <div className="bub me">My creatinine is 110. Is that bad?</div>
          <div className="bub ai">I can't read your own lab results. Please ask the doctor at your YAKAP clinic, who can look at them with your history.</div>
        </div>
      </div>
    </section>
  )
}
