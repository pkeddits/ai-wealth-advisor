import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { usePreferences } from '../../store/preferencesStore';

const QUERY = '(min-width: 1024px) and (pointer: fine)';

/**
 * Efeitos contínuos (flutuação, parallax) só rodam em desktop, sem preferência do sistema
 * por movimento reduzido, com animações em intensidade total e efeitos premium ligados.
 */
export function useRichMotion(): boolean {
  const reduced = useReducedMotion();
  const motion = usePreferences((s) => s.motion);
  const effects = usePreferences((s) => s.effects);
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setDesktop(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return desktop && !reduced && motion === 'full' && effects;
}
