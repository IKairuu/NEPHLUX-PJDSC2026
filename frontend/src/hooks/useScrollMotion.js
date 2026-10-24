import { useEffect } from 'react'

// One passive scroll listener, batched into a frame: fills the top progress line and gives the hero a light
// parallax (the kidney drifts slower than the page, the copy fades a little). Writes transforms and opacity only.
// Off with reduced motion; parallax is also off on phones.
export function useScrollMotion(bar) {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const wide = window.matchMedia('(min-width: 761px)')
    const hero = document.getElementById('top')
    const stage = hero?.querySelector('.stage'), copy = hero?.querySelector('.hcopy')
    let raf = 0

    const paint = () => {
      raf = 0
      // read everything first, then write, so the frame never forces a second layout
      const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight
      const h = hero ? hero.offsetHeight : 0
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`
      if (!hero || !wide.matches) {
        if (stage) stage.style.transform = ''
        if (copy) copy.style.opacity = ''
        return
      }
      if (y > h) return
      stage.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0)`
      copy.style.opacity = String(1 - Math.min(1, y / h) * 0.55)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint) }

    paint()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [bar])
}
