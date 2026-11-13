import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import clsx from 'clsx';
import type { Tutorial } from '../../tutorials/content';

export function TutorialModal({ tutorial, onClose }: { tutorial: Tutorial | null; onClose: (completed: boolean) => void }) {
  const [step, setStep] = useState(0);
  const reduced = useReducedMotion();
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
  return (
    <AnimatePresence>
      {tutorial && current && (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose(false)} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
            className="panel-glass relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden !rounded-[28px] shadow-[0_40px_120px_-40px_rgb(var(--indigo)/0.9)]"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="h-1 w-full bg-dark-100">
              <motion.div className="h-full bg-brand" animate={{ width: `${((step + 1) / total) * 100}%` }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <header className="flex items-center gap-3 px-5 pt-4 sm:px-6">
              <span className="chip border-primary-500/30 bg-primary-500/10 text-primary-800">Guia · {tutorial.title}</span>
              <span className="text-xs text-dark-500">Etapa {step + 1} de {total}</span>
              <button type="button" onClick={() => onClose(false)} className="ml-auto rounded-xl p-2 text-dark-500 transition-colors hover:bg-dark-100 hover:text-dark-900" aria-label="Fechar tutorial"><X className="h-5 w-5" /></button>
            </header>
            <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 sm:p-6 lg:grid-cols-[1.55fr_1fr]">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-dark-200/70 bg-dark-100">
                <AnimatePresence mode="wait">
                  <motion.div key={current.image} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
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
              </div>
              <div className="flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                    <h2 id="tutorial-title" className="text-display text-2xl leading-tight sm:text-[1.7rem]">{current.title}</h2>
                    <p className="mt-3 text-[15px] leading-relaxed text-dark-600">{current.body}</p>
                  </motion.div>
                </AnimatePresence>
                <div className="mt-6 flex gap-1.5" role="tablist" aria-label="Etapas">
                  {tutorial.steps.map((s, i) => (
                    <button key={s.title} type="button" role="tab" aria-selected={i === step} aria-label={`Etapa ${i + 1}: ${s.title}`} onClick={() => setStep(i)} className={clsx('h-2 rounded-full transition-all', i === step ? 'w-8 bg-brand' : 'w-2 bg-dark-300 hover:bg-dark-400')} />
                  ))}
                </div>
                <div className="mt-auto flex items-center gap-2 pt-8">
                  {!last && <button type="button" onClick={() => onClose(false)} className="rounded-xl px-3 py-2.5 text-sm text-dark-500 transition-colors hover:text-dark-900">Pular</button>}
                  <div className="ml-auto flex gap-2">
                    {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1.5 rounded-xl border border-dark-200 px-4 py-2.5 text-sm font-medium text-dark-800 transition-colors hover:bg-dark-100"><ArrowLeft className="h-4 w-4" />Anterior</button>}
                    <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => (last ? onClose(true) : setStep(step + 1))} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand shadow-[0_10px_30px_-12px_rgb(var(--violet)/0.9)]">
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
