import { CapabilityCounters } from "@/components/landing/CapabilityCounters";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { LandingFooter } from "@/components/landing/Footer";
import { LandingHero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { InteractiveSirPlayground } from "@/components/landing/InteractiveSirPlayground";
import { LandingNavbar } from "@/components/landing/Navbar";
import { RigorSection } from "@/components/landing/RigorSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <CapabilityCounters />
        <FeaturesGrid />
        <HowItWorks />
        <InteractiveSirPlayground />
        <RigorSection />
      </main>
      <LandingFooter />
    </div>
  );
}
