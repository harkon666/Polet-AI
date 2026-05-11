import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '../components/Hero'
import { TrustStrip } from '../components/TrustStrip'
import { StatsCounter } from '../components/StatsCounter'
import { Manifesto } from '../components/Manifesto'
import { RailsSection } from '../components/RailsSection'
import { DemoWidget } from '../components/DemoWidget'
import { SecuritySection } from '../components/SecuritySection'
import { FinalCtaSection } from '../components/FinalCtaSection'
import { Footer } from '../components/Footer'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

export function LandingPage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <StatsCounter />
      <Manifesto />
      <RailsSection />
      <DemoWidget />
      <SecuritySection />
      <FinalCtaSection />
      <Footer />
    </>
  )
}
