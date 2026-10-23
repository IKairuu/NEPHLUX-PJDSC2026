import { useEffect } from 'react'

// Fades in every .reveal element as it scrolls into view (all at once with reduced motion).
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'))
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach((e) => e.classList.add('in'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((x) => {
        if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target) }
      })
    }, { rootMargin: '0px 0px -8% 0px' })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
}
