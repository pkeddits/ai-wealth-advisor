import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { create } from 'zustand';
import { usePreferences } from '../../store/preferencesStore';
import { useAuthStore } from '../../store/authStore';
import { TUTORIALS, tutorialFor, type Tutorial, type TutorialId } from '../../tutorials/content';
import { TutorialModal } from './TutorialModal';
import { accountSync } from '../../services/accountSync';

export const useTutorial = create<{ active: Tutorial | null; open: (id: TutorialId) => void; close: () => void }>((set) => ({
  active: null,
  open: (id) => set({ active: TUTORIALS.find((t) => t.id === id) ?? null }),
  close: () => set({ active: null }),
}));

/** Abre o guia da área na primeira visita (se a preferência permitir) e registra os já vistos na conta. */
export function TutorialHost() {
  const { pathname } = useLocation();
  const { active, open, close } = useTutorial();
  const auto = usePreferences((s) => s.tutorialsAuto);
  const seen = usePreferences((s) => s.tutorialsSeen);
  const pending = usePreferences((s) => s.tutorialsReplay);
  // Até a conta carregar, o histórico local pode estar vazio ou ser de outro aparelho: não abre nada.
  const loaded = usePreferences((s) => s.accountLoaded);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const t = tutorialFor(pathname);
    if (!loaded || !isAuthenticated || !t || useTutorial.getState().active) return;
    if (!pending.includes(t.id) && (!auto || seen.includes(t.id))) return;
    const timer = setTimeout(() => open(t.id), 700);
    return () => clearTimeout(timer);
  }, [pathname, auto, seen, pending, open, loaded, isAuthenticated]);

  return (
    <TutorialModal
      tutorial={active}
      onClose={() => {
        if (active && (!seen.includes(active.id) || pending.includes(active.id))) void accountSync.markTutorialSeen(active.id);
        close();
      }}
    />
  );
}
