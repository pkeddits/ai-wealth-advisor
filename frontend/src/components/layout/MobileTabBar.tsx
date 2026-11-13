import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutDashboard, Menu, ReceiptText, Sparkles, Wallet, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/portfolios', label: 'Carteiras', icon: Wallet },
  { href: '/financas', label: 'Finanças', icon: ReceiptText },
];

/** Some enquanto um campo de texto estiver em foco: com o teclado aberto, a barra cobriria o formulário. */
function useTypingFocus() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const editable = (t: EventTarget | null) => t instanceof HTMLElement && (t.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select') || t.isContentEditable);
    const onIn = (e: FocusEvent) => editable(e.target) && setTyping(true);
    const onOut = (e: FocusEvent) => editable(e.target) && !editable(e.relatedTarget) && setTyping(false);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);
  return typing;
}

function Tab({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <NavLink to={href} aria-current={active ? 'page' : undefined} className="relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium">
      {active && <motion.span layoutId="tab-active" className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-primary-500/15" transition={{ type: 'spring', stiffness: 520, damping: 38 }} aria-hidden="true" />}
      <motion.span whileTap={{ scale: 0.86 }} className="relative">
        <Icon className={clsx('h-5 w-5 transition-colors', active ? 'text-primary-700 drop-shadow-[0_0_8px_rgb(var(--violet)/0.6)]' : 'text-dark-500')} aria-hidden="true" />
      </motion.span>
      <span className={clsx('relative transition-colors', active ? 'text-dark-900' : 'text-dark-500')}>{label}</span>
    </NavLink>
  );
}

export function MobileTabBar() {
  const { pathname } = useLocation();
  const { openMobileNav, isMobileNavOpen, isAssistantOpen, setAssistantOpen } = useUIStore();
  const typing = useTypingFocus();
  const hidden = typing || isAssistantOpen;
  const assistantAvailable = !pathname.startsWith('/ai-analysis');
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const elsewhere = !TABS.some((t) => isActive(t.href));

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.nav
          aria-label="Navegação rápida"
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),10px)] lg:hidden"
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          <div className="mx-auto flex max-w-lg items-center gap-1 rounded-[26px] border border-dark-200/60 bg-dark-50/85 p-1.5 shadow-[0_18px_50px_-18px_rgb(0_0_0/0.8)] backdrop-blur-xl">
            <Tab {...TABS[0]} active={isActive(TABS[0].href)} />
            <Tab {...TABS[1]} active={isActive(TABS[1].href)} />
            <div className="flex flex-1 justify-center">
              <motion.button
                type="button"
                onClick={() => setAssistantOpen(true)}
                disabled={!assistantAvailable}
                whileTap={{ scale: 0.9 }}
                aria-label="Abrir assistente de IA"
                className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-[20px] bg-brand text-on-brand shadow-[0_14px_34px_-10px_rgb(var(--violet)/0.95)] ring-4 ring-dark-50 disabled:opacity-40"
              >
                <span className="assistant-halo absolute inset-0 rounded-[20px]" aria-hidden="true" />
                <Sparkles className="relative h-5 w-5" />
              </motion.button>
            </div>
            <Tab {...TABS[2]} active={isActive(TABS[2].href)} />
            <button
              type="button"
              onClick={openMobileNav}
              aria-expanded={isMobileNavOpen}
              className="relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium"
            >
              {elsewhere && <motion.span layoutId="tab-active" className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-primary-500/15" aria-hidden="true" />}
              <Menu className={clsx('relative h-5 w-5', elsewhere ? 'text-primary-700' : 'text-dark-500')} aria-hidden="true" />
              <span className={clsx('relative', elsewhere ? 'text-dark-900' : 'text-dark-500')}>Mais</span>
            </button>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
