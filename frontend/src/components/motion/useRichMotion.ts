import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

const QUERY = '(min-width: 1024px) and (pointer: fine)';

/** Efeitos contínuos (flutuação, parallax) só rodam em desktop sem preferência por movimento reduzido. */
export function useRichMotion(): boolean {
  const reduced = useReducedMotion();
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setDesktop(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return desktop && !reduced;
}
