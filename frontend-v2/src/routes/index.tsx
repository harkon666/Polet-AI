import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '../components/Hero'
import { TrustStrip } from '../components/TrustStrip'
import { StatsCounter } from '../components/StatsCounter'
import { Manifesto } from '../components/Manifesto'
import { RailsSection } from '../components/RailsSection'
import { DemoWidget } from '../components/DemoWidget'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <StatsCounter />
      <Manifesto />
      <RailsSection />
      <DemoWidget />
      {/* Day 6 sections come below: Security, Final CTA, Footer */}
    </>
  )
}
