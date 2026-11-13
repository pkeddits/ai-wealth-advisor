import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { useCalmMotion } from '../motion';

/**
 * Luz de fundo da landing que atravessa as seções conforme a rolagem: violeta no topo,
 * azul no meio, de volta ao violeta no fechamento. Gradientes radiais já suaves (sem filtro
 * de blur) e apenas transform, para manter a rolagem fluida também no celular.
 */
export function LandingAtmosphere() {
  const calm = useCalmMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 0.6 });
  const k = calm ? 0 : 1;
  const aX = useTransform(progress, [0, 0.5, 1], [-18 * k, 22 * k, -6 * k].map((v) => `${v}vw`));
  const aY = useTransform(progress, [0, 1], [-10 * k, 40 * k].map((v) => `${v}vh`));
  const bX = useTransform(progress, [0, 0.5, 1], [26 * k, -20 * k, 14 * k].map((v) => `${v}vw`));
  const bY = useTransform(progress, [0, 1], [30 * k, -8 * k].map((v) => `${v}vh`));
  const bOpacity = useTransform(progress, [0, 0.25, 0.75, 1], [0.35, 0.8, 0.8, 0.45]);

  return (
    <div className="fx-decor pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute left-1/2 top-0 h-[90vh] w-[90vw] max-w-[1100px] -translate-x-1/2 rounded-full"
        style={{ x: aX, y: aY, background: 'radial-gradient(closest-side, rgb(var(--violet) / 0.16), transparent)' }}
      />
      <motion.div
        className="absolute left-1/2 top-[20vh] h-[80vh] w-[80vw] max-w-[980px] -translate-x-1/2 rounded-full"
        style={{ x: bX, y: bY, opacity: bOpacity, background: 'radial-gradient(closest-side, rgb(var(--azure) / 0.14), transparent)' }}
      />
    </div>
  );
}

/** Linha de luz que se desenha quando a próxima seção entra na tela. */
export function SectionSeam() {
  const calm = useCalmMotion();
  return (
    <div className="relative mx-auto h-px max-w-5xl px-8" data-seam="" aria-hidden="true">
      <motion.div
        className="h-px w-full origin-center bg-gradient-to-r from-transparent via-primary-500/60 to-transparent"
        initial={calm ? { opacity: 0.6 } : { scaleX: 0, opacity: 0 }}
        whileInView={calm ? { opacity: 0.6 } : { scaleX: 1, opacity: 1 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-2 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/40"
        style={{ filter: 'blur(6px)' }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: calm ? 0 : 1 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
    </div>
  );
}
