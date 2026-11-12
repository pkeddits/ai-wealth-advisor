import { Car, GraduationCap, HeartPulse, Home, MoreHorizontal, Popcorn, UtensilsCrossed, Wallet, type LucideIcon } from 'lucide-react';
import type { FinanceCategory, FinanceKind } from '../../types';

export const CATEGORIES: Record<FinanceCategory, { label: string; icon: LucideIcon; kinds: FinanceKind[] }> = {
  salario: { label: 'Salário', icon: Wallet, kinds: ['receita'] },
  alimentacao: { label: 'Alimentação', icon: UtensilsCrossed, kinds: ['despesa'] },
  transporte: { label: 'Transporte', icon: Car, kinds: ['despesa'] },
  moradia: { label: 'Moradia', icon: Home, kinds: ['despesa'] },
  lazer: { label: 'Lazer', icon: Popcorn, kinds: ['despesa'] },
  saude: { label: 'Saúde', icon: HeartPulse, kinds: ['despesa'] },
  educacao: { label: 'Educação', icon: GraduationCap, kinds: ['despesa'] },
  outros: { label: 'Outros', icon: MoreHorizontal, kinds: ['receita', 'despesa'] },
};

export const categoriesFor = (kind: FinanceKind) =>
  (Object.keys(CATEGORIES) as FinanceCategory[]).filter((c) => CATEGORIES[c].kinds.includes(kind));
