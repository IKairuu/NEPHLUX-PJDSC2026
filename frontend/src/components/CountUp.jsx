import { useEffect, useRef, useState } from 'react'

const still = () => !('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Counts up to `to` the first time it scrolls into view and lands on exactly format(to).
// Screen readers only get the final value; the moving digits are hidden from them.
export default function CountUp({ to, format = (v) => String(Math.round(v)), duration = 1400 }) {
  const ref = useRef(null)
  const [v, setV] = useState(() => (still() ? to : 0))

  useEffect(() => {
    if (still()) { setV(to); return }
    let raf
    const io = new IntersectionObserver(([x]) => {
      if (!x.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / duration)
        setV(k === 1 ? to : to * (1 - (1 - k) ** 3))
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    io.observe(ref.current)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [to, duration])

  return <span className="count" ref={ref}><span className="sr-only">{format(to)}</span><span aria-hidden="true">{format(v)}</span></span>
}
