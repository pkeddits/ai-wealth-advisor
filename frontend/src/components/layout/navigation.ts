import { AlertTriangle, BarChart3, Bot, LayoutDashboard, ReceiptText, Settings, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import type { AppMode } from '../../config/appMode';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Modos em que a página tem implementação; nos demais ela mostra "Em desenvolvimento". */
  availableIn: AppMode[];
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Visão geral',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, availableIn: ['demo', 'supabase', 'api'] },
      { name: 'Carteiras', href: '/portfolios', icon: Wallet, availableIn: ['demo', 'supabase', 'api'] },
      { name: 'Finanças pessoais', href: '/financas', icon: ReceiptText, availableIn: ['demo', 'supabase'] },
    ],
  },
  {
    title: 'Inteligência',
    items: [
      { name: 'Análise IA', href: '/ai-analysis', icon: Bot, availableIn: ['api'] },
      { name: 'Analytics', href: '/analytics', icon: BarChart3, availableIn: ['api'] },
      { name: 'Simulações', href: '/simulations', icon: TrendingUp, availableIn: ['api'] },
    ],
  },
  {
    title: 'Conta',
    items: [
      { name: 'Alertas', href: '/alerts', icon: AlertTriangle, availableIn: ['api'] },
      { name: 'Configurações', href: '/settings', icon: Settings, availableIn: ['demo', 'supabase', 'api'] },
    ],
  },
];

export function pageTitle(pathname: string): string {
  if (pathname.startsWith('/portfolios/')) return 'Carteira';
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((i) => pathname === i.href);
    if (item) return item.name;
  }
  return 'Painel';
}
