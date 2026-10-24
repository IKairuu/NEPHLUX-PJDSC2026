import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import clsx from 'clsx'
import Icon from './Icon'
import NephraFace from './NephraFace'
import { api } from '../lib/api'
import { useUIStore } from '../store/useUIStore'

const GREETING = "Hi, I'm Nephra. I can explain how NEPHLUX works, what YAKAP covers, what a uACR test is, and where to go next. I can't diagnose or read your own results."
const DISCLAIMER = 'Help assistant · answered by AI from checked answers, not for diagnosis.'
const SUGGESTIONS = ['What is NEPHLUX?', 'Where is the nearest YAKAP clinic?', 'What is my risk score?', 'My creatinine is 110. Is that bad?']

// Replies come from POST /nephra/chat. When the API cannot be reached, these approved answers (same shape as
// NephraChatResponseDto) keep the panel useful; anything else gets the did-you-mean fallback.
const MOCK = {
  'what is nephlux?': { kind: 'answer', reply: 'NEPHLUX helps Cagayan de Oro decide who should get a urine albumin test first. It reads lab tests that YAKAP already pays for, so a doctor can decide.\n\nIt supports doctors. It does not give a diagnosis.', links: [{ label: 'How it works', path: '/#how' }] },
  'where is the nearest yakap clinic?': { kind: 'answer', reply: 'The resident check ends with a map of YAKAP clinics near your barangay, and shows which ones are free.', links: [{ label: 'Start the 2-minute check', path: '/resident/check' }] },
  'what is my risk score?': { kind: 'no_calculation', reply: "I never calculate scores. The 2-minute check gives an awareness result, and a YAKAP clinic's assessment uses your labs.", links: [{ label: 'Start the 2-minute check', path: '/resident/check' }] },
  'my creatinine is 110. is that bad?': { kind: 'see_doctor', reply: "I can't read or judge your own numbers or results. A doctor reads them together with your history and other tests, so please show them to your YAKAP doctor.\n\nIf you feel very unwell, go to an emergency room.", links: [] },
}
const FALLBACK = { kind: 'did_you_mean', reply: "I'm not sure I have a checked answer for that. Did you mean one of these?", links: [], suggestions: SUGGESTIONS.slice(0, 3) }

function offlineReply(message) {
  return { suggestions: [], ...(MOCK[message.trim().toLowerCase()] || FALLBACK) }
}

// the backend's roles: staff by their session, residents on their own screens, everyone else a guest
function roleOf(session, pathname) {
  if (session?.role) return session.role
  return pathname.startsWith('/resident') ? 'resident' : 'guest'
}
// "/doctor/queue" -> "doctor-queue", "/" -> "landing"
const screenOf = (pathname) => (pathname.split('/').filter(Boolean).join('-') || 'landing').slice(0, 40)

async function reply(message, ctx, log) {
  // the turns before this message (not the greeting), trimmed to what the API accepts; it reads only the user's turns
  const history = log.slice(1).slice(-6).map((m) => ({ who: m.who, text: m.text.slice(0, 500) }))
  try {
    return await api.nephra.chat({ message, role: ctx.role, screen: ctx.screen, history })
  } catch (e) {
    // 429: too many messages for now; say so instead of answering from the approved list
    if (e.status === 429) return { kind: 'rate_limited', reply: e.message, links: [], suggestions: [] }
    return offlineReply(message)
  }
}

const MOOD = { answer: 'explaining', emergency: 'concerned', see_doctor: 'concerned', no_calculation: 'explaining', did_you_mean: 'thinking', no_answer: 'thinking', off_topic: 'thinking', rate_limited: 'thinking' }
const SAFETY = { see_doctor: 'Please see a YAKAP doctor for this', emergency: 'Go to the nearest emergency room now' }

export default function NephraPanel() {
  const open = useUIStore((s) => s.nephraOpen)
  const setOpen = useUIStore((s) => s.setNephraOpen)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const session = useUIStore((s) => s.session)
  const role = roleOf(session, pathname)
  const [info, setInfo] = useState({ suggestions: SUGGESTIONS, disclaimer: DISCLAIMER })
  const [log, setLog] = useState([{ who: 'nephra', text: GREETING, kind: 'answer' }])
  const [mood, setMood] = useState('happy')
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const bodyRef = useRef(null), inputRef = useRef(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  // suggestion chips and the disclaimer for this role; the built-in ones stay if the API is down
  useEffect(() => {
    if (!open) return
    let live = true
    api.nephra.info(role).then((r) => {
      if (live) setInfo({ suggestions: r.suggestions?.length ? r.suggestions : SUGGESTIONS, disclaimer: r.disclaimer || DISCLAIMER })
    }, () => {})
    return () => { live = false }
  }, [open, role])
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight }, [log, typing, open])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  if (!open) return null

  // the latest reply's suggestions when it gave some, else the role's starters from GET /nephra
  const latest = [...log].reverse().find((m) => m.who === 'nephra' && m.kind !== 'did_you_mean' && m.suggestions?.length)
  const suggestions = latest ? latest.suggestions : info.suggestions

  function close() {
    setOpen(false)
    // the FAB comes back on the next render; give it focus again
    setTimeout(() => document.getElementById('nfab')?.focus(), 0)
  }

  async function ask(q) {
    if (!q || typing) return
    setLog((l) => [...l, { who: 'user', text: q }])
    setTyping(true)
    setMood('thinking')
    const r = await reply(q, { role, screen: screenOf(pathname) }, log)
    setLog((l) => [...l, { who: 'nephra', text: r.reply, kind: r.kind, links: r.links, suggestions: r.suggestions }])
    setMood(MOOD[r.kind] || 'happy')
    setTyping(false)
  }

  function submit(e) {
    e.preventDefault()
    const q = text.trim()
    if (!q) return
    setText('')
    ask(q)
  }

  // links carry a frontend path; "/#how" style paths scroll to a landing section
  function follow(path) {
    const [route, hash] = path.split('#')
    navigate(route || '/')
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 60)
    if (window.matchMedia('(max-width: 520px)').matches) setOpen(false)
  }

  return (
    <div className="npanel" role="dialog" aria-modal="false" aria-labelledby="nTitle">
      <div className="nhead">
        <span className="nav-av" aria-hidden="true"><NephraFace emotion={mood} size={44} /></span>
        <div><b id="nTitle">Nephra</b><small>{info.disclaimer}</small></div>
        <button type="button" className="icon-btn" aria-label="Close Nephra" onClick={close}><Icon name="x" className="" /></button>
      </div>

      <div className="nbody" ref={bodyRef} aria-live="polite">
        {log.map((m, i) => (
          <div key={i} className="nturn">
            <div className={clsx('bub', m.who === 'user' ? 'me' : 'ai', SAFETY[m.kind] && 'medical', m.kind === 'emergency' && 'emergency')}>{m.text}</div>
            {!!m.links?.length && (
              <div className="nlinks">{m.links.map((l) => <button key={l.label} type="button" className="btn xs" onClick={() => follow(l.path)}>{l.label}<Icon name="arrow" /></button>)}</div>
            )}
            {SAFETY[m.kind] && <div className="nlinks"><span className={clsx('chip', m.kind === 'emergency' ? 'high' : 'follow')}><Icon name="alert" />{SAFETY[m.kind]}</span></div>}
            {m.kind === 'did_you_mean' && !!m.suggestions?.length && (
              <div className="nsug">{m.suggestions.map((s) => <button key={s} type="button" onClick={() => ask(s)}>{s}</button>)}</div>
            )}
          </div>
        ))}
        {typing && <div className="ntype" role="status" aria-label="Nephra is typing"><i /><i /><i /></div>}
      </div>

      {/* one dropdown of suggested questions instead of a chip row after every reply; it follows Nephra's latest suggestions */}
      <details className="nmenu" open={menuOpen} onToggle={(e) => setMenuOpen(e.currentTarget.open)}>
        <summary>Suggested questions <Icon name="chev" className="" /></summary>
        <div className="nmenu-list">
          {suggestions.map((s) => <button key={s} type="button" disabled={typing} onClick={() => { setMenuOpen(false); ask(s) }}>{s}</button>)}
        </div>
      </details>

      <form className="nform" onSubmit={submit}>
        <label className="sr-only" htmlFor="nq">Ask a question about NEPHLUX</label>
        <input id="nq" ref={inputRef} className="in" autoComplete="off" maxLength={500} placeholder="Ask about the app, YAKAP or uACR"
          value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn primary sm" type="submit" disabled={typing || !text.trim()}>Ask</button>
      </form>
      <p className="nfoot">Nothing you type is saved. For medical questions, see a YAKAP doctor.</p>
    </div>
  )
}
