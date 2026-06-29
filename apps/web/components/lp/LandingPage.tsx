import { ContactSection } from "./ContactSection";
import { FaqSection } from "./FaqSection";
import { FeaturesSection } from "./FeaturesSection";
import { HeroSection } from "./HeroSection";
import { LpFooter } from "./LpFooter";
import { LpHeader } from "./LpHeader";
import { LpRedirectGuard } from "./LpRedirectGuard";
import { PainPointsSection } from "./PainPointsSection";
import { PricingSection } from "./PricingSection";
import { SecuritySection } from "./SecuritySection";
import { StepsSection } from "./StepsSection";
import { UseCasesSection } from "./UseCasesSection";

export function LandingPage() {
  return (
    <LpRedirectGuard>
      <div className="min-h-screen bg-bg">
        <LpHeader />
        <main>
          <HeroSection />
          <PainPointsSection />
          <FeaturesSection />
          <UseCasesSection />
          <StepsSection />
          <SecuritySection />
          <PricingSection />
          <FaqSection />
          <ContactSection />
        </main>
        <LpFooter />
      </div>
    </LpRedirectGuard>
  );
}
