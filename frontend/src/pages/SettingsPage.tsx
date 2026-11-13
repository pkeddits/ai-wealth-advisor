import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { ProfileSection } from './settings/ProfileSection';
import { SecuritySection } from './settings/SecuritySection';
import { AppearanceSection, FinanceSection, IntegrationsSection, NotificationsSection } from './settings/PreferenceSections';
import { PrivacySection } from './settings/PrivacySection';
import { TutorialsSection } from './settings/TutorialsSection';

const SECTIONS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'seguranca', label: 'Conta e segurança' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'financas', label: 'Preferências financeiras' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'integracoes', label: 'Integrações' },
  { id: 'tutoriais', label: 'Tutoriais e ajuda' },
  { id: 'privacidade', label: 'Privacidade e dados' },
];

function useActiveSection() {
  const [active, setActive] = useState(SECTIONS[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -60% 0px' },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return [active, setActive] as const;
}

export function SettingsPage() {
  const [active, setActive] = useActiveSection();

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && SECTIONS.some((s) => s.id === id)) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 150);
  }, []);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-[2rem] leading-tight sm:text-[2.4rem]">Configurações</h1>
        <p className="mt-1 text-dark-600">Perfil, aparência, preferências e dados da sua conta.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Seções das configurações" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go(s.id)}
                  aria-current={active === s.id ? 'true' : undefined}
                  className={clsx(
                    'relative w-full whitespace-nowrap rounded-xl px-3.5 py-2 text-left text-sm font-medium transition-colors',
                    active === s.id ? 'text-dark-900' : 'text-dark-500 hover:text-dark-800',
                  )}
                >
                  {active === s.id && (
                    <motion.span layoutId="settings-active" className="absolute inset-0 rounded-xl border border-primary-500/30 bg-primary-500/10" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
                  )}
                  <span className="relative">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <ProfileSection />
          <SecuritySection />
          <AppearanceSection />
          <FinanceSection />
          <NotificationsSection />
          <IntegrationsSection />
          <TutorialsSection />
          <PrivacySection />
        </div>
      </div>
    </div>
  );
}
