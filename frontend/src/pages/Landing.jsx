import Nav from '../components/Nav'
import MobileNav from '../components/MobileNav'
import Hero from '../sections/Hero'
import StatBar from '../sections/StatBar'
import Features from '../sections/Features'
import HowItWorks from '../sections/HowItWorks'
import Evidence from '../sections/Evidence'
import Nephra from '../sections/Nephra'
import Impact from '../sections/Impact'
import Benefits from '../sections/Benefits'
import Access from '../sections/Access'
import Faq from '../sections/Faq'
import DemoCta from '../sections/DemoCta'
import Footer from '../sections/Footer'
import { useRef } from 'react'
import { useReveal } from '../hooks/useReveal'
import { useScrollMotion } from '../hooks/useScrollMotion'

export default function Landing() {
  const bar = useRef(null)
  useReveal()
  useScrollMotion(bar)
  return (
    <>
      <div className="scrollbar" ref={bar} aria-hidden="true" />
      <a className="skip" href="#main-landing">Skip to content</a>
      <Nav />
      <MobileNav />
      <main id="main-landing">
        <Hero />
        <div className="zone">
          <StatBar />
          <Features />
          <HowItWorks />
          <Evidence />
          <Nephra />
          <Impact />
          <Benefits />
          <Access />
          <Faq />
          <DemoCta />
          <Footer />
        </div>
      </main>
    </>
  )
}
