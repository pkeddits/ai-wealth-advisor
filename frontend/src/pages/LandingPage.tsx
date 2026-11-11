import { SiteHeader } from '../components/landing/SiteHeader';
import { Hero } from '../components/landing/Hero';
import { InvestmentsShowcase } from '../components/landing/InvestmentsShowcase';
import { PersonalFinanceShowcase } from '../components/landing/PersonalFinanceShowcase';
import { FeatureBento } from '../components/landing/FeatureBento';
import { HowItWorks } from '../components/landing/HowItWorks';
import { ClosingCta } from '../components/landing/ClosingCta';
import { SiteFooter } from '../components/landing/SiteFooter';

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-dark-50">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo">
        <Hero />
        <InvestmentsShowcase />
        <PersonalFinanceShowcase />
        <FeatureBento />
        <HowItWorks />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
