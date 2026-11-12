import { BadgeDollarSign, BriefcaseBusiness, Car, GraduationCap, HandCoins, HeartPulse, Home, MoreHorizontal, Popcorn, Receipt, RefreshCcw, ShoppingBag, Tag, TrendingUp, UtensilsCrossed, Wallet, type LucideIcon } from 'lucide-react';
import type { FinanceCategory, FinanceKind } from '../../types';
import { PREDEFINED_CATEGORIES } from '../../domain/categories';
import { useCustomCategories } from '../planning';

const ICONS: Record<string, LucideIcon> = {
  salario: Wallet, freelance: BriefcaseBusiness, venda_bens: HandCoins, comissoes: BadgeDollarSign, rendimentos: TrendingUp, reembolsos: RefreshCcw,
  alimentacao: UtensilsCrossed, transporte: Car, moradia: Home, saude: HeartPulse, educacao: GraduationCap, lazer: Popcorn, compras: ShoppingBag, assinaturas: Receipt, outros: MoreHorizontal,
};

export const CATEGORIES: Record<string, { label: string; icon: LucideIcon; kinds: FinanceKind[] }> = Object.fromEntries(
  Object.entries(PREDEFINED_CATEGORIES).map(([slug, c]) => [slug, { ...c, icon: ICONS[slug] ?? Tag }]),
);

/** Predefinidas e personalizadas ativas para o tipo (para novos lançamentos). */
export function categoriesFor(kind: FinanceKind): FinanceCategory[] {
  const custom = useCustomCategories.getState().list.filter((c) => c.kind === kind && c.isActive).map((c) => `custom:${c.id}` as FinanceCategory);
  return [...(Object.keys(CATEGORIES) as FinanceCategory[]).filter((c) => CATEGORIES[c].kinds.includes(kind)), ...custom];
}

export function categoryMeta(slug: string): { label: string; icon: LucideIcon } {
  if (slug.startsWith('custom:')) {
    const c = useCustomCategories.getState().list.find((x) => x.id === slug.slice(7));
    return { label: c ? `${c.name}${c.isActive ? '' : ' (desativada)'}` : 'Categoria personalizada', icon: Tag };
  }
  return CATEGORIES[slug] ?? { label: slug, icon: Tag };
}
