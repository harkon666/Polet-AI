import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '../components/Hero'
import { StatsCounter } from '../components/StatsCounter'
import { Manifesto } from '../components/Manifesto'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <>
      <Hero />
      <StatsCounter />
      <Manifesto />
      {/* Day 4+ sections come below: Demo widget, Rails, Security, Final CTA, Footer */}
    </>
  )
}
