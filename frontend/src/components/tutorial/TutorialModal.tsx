import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRichMotion } from '../motion';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import clsx from 'clsx';
import type { Tutorial } from '../../tutorials/content';
import { useMediaQuery } from '../../hooks/useVisualViewport';

/** No celular a captura (desktop) é aproximada na área destacada, que ocupa o quadro. */
function focusTransform(h: { x: number; y: number; w: number; h: number } | undefined, enabled: boolean) {
  if (!h || !enabled) return { scale: 1, x: '0%', y: '0%' };
  const scale = Math.min(2.4, Math.max(1, 0.92 * Math.min(100 / h.w, 100 / h.h)));
  const limit = (scale - 1) * 50;
  const clamp = (v: number) => Math.max(-limit, Math.min(limit, v));
  return { scale, x: `${clamp(-(h.x + h.w / 2 - 50) * scale)}%`, y: `${clamp(-(h.y + h.h / 2 - 50) * scale)}%` };
}

export function TutorialModal({ tutorial, onClose }: { tutorial: Tutorial | null; onClose: (completed: boolean) => void }) {
  const [step, setStep] = useState(0);
  const reduced = !useRichMotion();
  const compact = useMediaQuery('(max-width: 639px)');
  useEffect(() => setStep(0), [tutorial?.id]);

  const total = tutorial?.steps.length ?? 0;
  const last = step === total - 1;
  useEffect(() => {
    if (!tutorial) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, total - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tutorial, total, onClose]);

  const current = tutorial?.steps[step];
  const h = current?.highlight;
  const focus = focusTransform(h, compact);
  const go = (next: number) => setStep(Math.max(0, Math.min(total - 1, next)));
  return (
    <AnimatePresence>
      {tutorial && current && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-6 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose(false)} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
            className="panel-glass relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden !rounded-[28px] sm:max-h-[94dvh] shadow-[0_40px_120px_-40px_rgb(var(--indigo)/0.9)]"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="h-1 w-full bg-dark-100">
              <motion.div className="h-full bg-brand" animate={{ width: `${((step + 1) / total) * 100}%` }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <header className="flex items-center gap-2 px-4 pt-3 sm:gap-3 sm:px-6 sm:pt-4">
              <span className="chip min-w-0 truncate border-primary-500/30 bg-primary-500/10 text-primary-800">Guia · {tutorial.title}</span>
              <span className="shrink-0 text-xs text-dark-500">{step + 1} de {total}</span>
              <button type="button" onClick={() => onClose(false)} className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-dark-500 transition-colors hover:bg-dark-100 hover:text-dark-900" aria-label="Fechar tutorial"><X className="h-5 w-5" /></button>
            </header>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain px-4 pt-4 sm:gap-5 sm:p-6 lg:grid-cols-[1.55fr_1fr]">
              <motion.div className="relative aspect-[4/3] touch-pan-y overflow-hidden rounded-2xl border border-dark-200/70 bg-dark-100 sm:aspect-[16/10]" drag={compact ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} onDragEnd={(_, info) => { if (info.offset.x < -50) go(step + 1); else if (info.offset.x > 50) go(step - 1); }}>
                <AnimatePresence mode="wait">
                  <motion.div key={current.image} className="absolute inset-0" initial={{ opacity: 0, ...focus }} animate={{ opacity: 1, ...focus }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                    <motion.img
                      src={current.image}
                      alt={`Tela de ${tutorial.title}: ${current.title}`}
                      className="h-full w-full object-cover object-top"
                      style={{ transformOrigin: h ? `${h.x + h.w / 2}% ${h.y + h.h / 2}%` : 'center' }}
                      initial={{ scale: 1 }}
                      animate={{ scale: reduced ? 1 : 1.06 }}
                      transition={{ duration: 6, ease: 'easeOut' }}
                    />
                    {h && (
                      <motion.div
                        className="pointer-events-none absolute rounded-xl"
                        style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%`, boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.45)', transformOrigin: `${50 - (h.x + h.w / 2) + 50}% center` }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                      >
                        <motion.span className="absolute -inset-1 rounded-[14px] border-2 border-primary-400" animate={reduced ? undefined : { opacity: [0.9, 0.35, 0.9], scale: [1, 1.03, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
              <div className="flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                    <h2 id="tutorial-title" className="text-display text-xl leading-tight sm:text-[1.7rem]">{current.title}</h2>
                    <p className="mt-3 text-[15px] leading-relaxed text-dark-600">{current.body}</p>
                  </motion.div>
                </AnimatePresence>
                <div className="mt-5 flex gap-1.5 sm:mt-6" role="tablist" aria-label="Etapas">
                  {tutorial.steps.map((s, i) => (
                    <button key={s.title} type="button" role="tab" aria-selected={i === step} aria-label={`Etapa ${i + 1}: ${s.title}`} onClick={() => setStep(i)} className={clsx('relative h-2 rounded-full transition-all after:absolute after:-inset-3 after:content-[""]', i === step ? 'w-8 bg-brand' : 'w-2 bg-dark-300 hover:bg-dark-400')} />
                  ))}
                </div>
                <div className="sticky bottom-0 -mx-4 mt-auto flex items-center gap-2 border-t border-dark-200/50 bg-surface-raised/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-8 sm:backdrop-blur-none">
                  {!last && <button type="button" onClick={() => onClose(false)} className="min-h-11 rounded-xl px-3 text-sm text-dark-500 transition-colors hover:text-dark-900">Pular</button>}
                  <div className="ml-auto flex gap-2">
                    {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dark-200 px-3.5 text-sm font-medium text-dark-800 transition-colors hover:bg-dark-100 sm:px-4" aria-label="Etapa anterior"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Anterior</span></button>}
                    <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => (last ? onClose(true) : setStep(step + 1))} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand shadow-[0_10px_30px_-12px_rgb(var(--violet)/0.9)]">
                      {last ? <>Concluir<Check className="h-4 w-4" /></> : <>Próximo<ArrowRight className="h-4 w-4" /></>}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
