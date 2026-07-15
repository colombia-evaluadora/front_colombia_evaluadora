import { LandingNavbar } from "../components/landing-navbar"
import { LandingHero } from "../components/landing-hero"
import { LandingReserveSection } from "../components/landing-reserve-section"
import { LandingAdmissionTimeline } from "../components/landing-admission-timeline"

export function LandingPage() {
  return (
    <>
      <LandingNavbar />
      <LandingHero />
      <LandingReserveSection />
      <hr className="mx-8 border-gray-200" />
      <LandingAdmissionTimeline />
    </>
  )
}
