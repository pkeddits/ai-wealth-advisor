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
    <div className="relative min-h-screen overflow-x-clip">
      <div className="ambient-orb -left-48 top-[120vh] h-[520px] w-[520px] text-primary-500/30" style={{ zIndex: -1 }} aria-hidden="true" />
      <div className="ambient-orb -right-48 top-[220vh] h-[460px] w-[460px] text-blue-500/25" style={{ zIndex: -1, animationDelay: '-12s' }} aria-hidden="true" />
      <div className="ambient-orb left-1/3 top-[340vh] h-[420px] w-[420px] text-accent-500/20" style={{ zIndex: -1, animationDelay: '-5s' }} aria-hidden="true" />
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
