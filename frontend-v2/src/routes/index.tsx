import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '../components/Hero'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <>
      <Hero />
      {/* Day 3+ sections come below: Stats, Manifesto, Demo widget, Rails, Security, Final CTA, Footer */}
    </>
  )
}
