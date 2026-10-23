import Sprite from './components/Sprite'
import Nav from './components/Nav'
import MobileNav from './components/MobileNav'
import NephraFab from './components/NephraFab'
import Toast from './components/Toast'
import Hero from './sections/Hero'
import Features from './sections/Features'
import HowItWorks from './sections/HowItWorks'
import Evidence from './sections/Evidence'
import Nephra from './sections/Nephra'
import Impact from './sections/Impact'
import Benefits from './sections/Benefits'
import Access from './sections/Access'
import Faq from './sections/Faq'
import DemoCta from './sections/DemoCta'
import Footer from './sections/Footer'
import { useReveal } from './hooks/useReveal'

export default function App() {
  useReveal()
  return (
    <>
      <a className="skip" href="#main-landing">Skip to content</a>
      <Sprite />
      <Nav />
      <MobileNav />
      <main id="main-landing">
        <Hero />
        <div className="zone">
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
      <NephraFab />
      <Toast />
    </>
  )
}
