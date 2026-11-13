import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { create } from 'zustand';
import { usePreferences } from '../../store/preferencesStore';
import { TUTORIALS, tutorialFor, type Tutorial, type TutorialId } from '../../tutorials/content';
import { TutorialModal } from './TutorialModal';

export const useTutorial = create<{ active: Tutorial | null; open: (id: TutorialId) => void; close: () => void }>((set) => ({
  active: null,
  open: (id) => set({ active: TUTORIALS.find((t) => t.id === id) ?? null }),
  close: () => set({ active: null }),
}));

/** Abre o guia da área na primeira visita (se a preferência permitir) e registra os já vistos. */
export function TutorialHost() {
  const { pathname } = useLocation();
  const { active, open, close } = useTutorial();
  const auto = usePreferences((s) => s.tutorialsAuto);
  const seen = usePreferences((s) => s.tutorialsSeen);
  const set = usePreferences((s) => s.set);

  useEffect(() => {
    const t = tutorialFor(pathname);
    if (!t || !auto || seen.includes(t.id) || useTutorial.getState().active) return;
    const timer = setTimeout(() => open(t.id), 700);
    return () => clearTimeout(timer);
  }, [pathname, auto, seen, open]);

  return (
    <TutorialModal
      tutorial={active}
      onClose={() => {
        if (active && !seen.includes(active.id)) set('tutorialsSeen', [...seen, active.id]);
        close();
      }}
    />
  );
}
