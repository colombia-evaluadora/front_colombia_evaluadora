import { LandingNavbar } from "@/features/landing/components/landing-navbar"
import { LandingHero } from "@/features/landing/components/landing-hero"
import { LandingReserveSection } from "@/features/landing/components/landing-reserve-section"
import { LandingAdmissionTimeline } from "@/features/landing/components/landing-admission-timeline"

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
