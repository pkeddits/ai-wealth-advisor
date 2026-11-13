import { useEffect, useState, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { usePreferences } from '../../store/preferencesStore';

function useSystemDark() {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return dark;
}

/** Aplica as preferências de aparência ao documento e à configuração global de animação. */
export function PreferencesEffects({ children }: { children: ReactNode }) {
  const { theme, motion, density, effects, hideValues } = usePreferences(useShallow((s) => ({ theme: s.theme, motion: s.motion, density: s.density, effects: s.effects, hideValues: s.hideValues })));
  const systemDark = useSystemDark();
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.motion = motion;
    root.dataset.density = density;
    root.dataset.effects = effects ? 'on' : 'off';
    root.dataset.hideValues = hideValues ? 'on' : 'off';
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (sessionStorage.getItem('aiwa.perf') === 'low' || (memory !== undefined ? memory <= 2 : (navigator.hardwareConcurrency ?? 8) <= 2)) root.dataset.perf = 'low';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'light' ? '#f6f7fb' : '#07080e');
  }, [resolvedTheme, motion, density, effects, hideValues]);

  return <MotionConfig reducedMotion={motion === 'off' ? 'always' : 'user'}>{children}</MotionConfig>;
}
