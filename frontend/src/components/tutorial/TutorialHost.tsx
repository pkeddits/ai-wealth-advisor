import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { create } from 'zustand';
import { usePreferences } from '../../store/preferencesStore';
import { useAuthStore } from '../../store/authStore';
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
  const replay = usePreferences((s) => s.tutorialsReplay);
  const set = usePreferences((s) => s.set);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const pending = (userId && replay[userId]) || [];

  useEffect(() => {
    const t = tutorialFor(pathname);
    if (!t || useTutorial.getState().active) return;
    if (!pending.includes(t.id) && (!auto || seen.includes(t.id))) return;
    const timer = setTimeout(() => open(t.id), 700);
    return () => clearTimeout(timer);
  }, [pathname, auto, seen, pending, open]);

  return (
    <TutorialModal
      tutorial={active}
      onClose={() => {
        if (active && !seen.includes(active.id)) set('tutorialsSeen', [...seen, active.id]);
        if (active && userId && pending.includes(active.id)) {
          const rest = pending.filter((id) => id !== active.id);
          const next = { ...replay };
          if (rest.length) next[userId] = rest;
          else delete next[userId];
          set('tutorialsReplay', next);
        }
        close();
      }}
    />
  );
}
