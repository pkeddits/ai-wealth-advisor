import { useReducedMotion } from 'motion/react';
import { usePreferences } from '../../store/preferencesStore';

/**
 * Linguagem de movimento do produto. Três famílias, cada uma com um papel:
 * - resposta: confirma uma ação do usuário (toque, troca de aba, envio); curta e com mola firme;
 * - transição: mostra de onde vem e para onde vai o conteúdo (troca de visão, conversa, período);
 * - ambiente: luz lenta de fundo, só em desktop com efeitos completos e nunca sobre os números.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;

export const DURATION = { response: 0.18, transition: 0.36, value: 0.9, ambient: 24 } as const;

export const SPRING = {
  response: { type: 'spring', stiffness: 520, damping: 34 },
  transition: { type: 'spring', stiffness: 340, damping: 34 },
} as const;

/** Verdadeiro quando o sistema pede menos movimento ou o usuário escolheu animações reduzidas ou desligadas. */
export function useCalmMotion(): boolean {
  const system = useReducedMotion();
  const level = usePreferences((s) => s.motion);
  return Boolean(system) || level !== 'full';
}

/** Como interpretar uma alta: boa (patrimônio, receita), ruim (despesa, pendências) ou sem sinal. */
export type CueTone = 'normal' | 'inverse' | 'none';

/**
 * Marca por um instante se a mudança de valor foi favorável (verde) ou desfavorável (vermelho).
 * Reinicia a animação CSS sem recriar o elemento.
 */
export function cueChange(node: HTMLElement, from: number, to: number, tone: CueTone = 'normal') {
  if (tone === 'none' || Math.abs(to - from) < 0.005) return;
  const rose = to > from;
  node.dataset.cue = (tone === 'inverse' ? !rose : rose) ? 'up' : 'down';
  node.classList.remove('value-cue');
  void node.offsetWidth;
  node.classList.add('value-cue');
}
