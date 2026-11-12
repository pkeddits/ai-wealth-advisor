export type Kind = 'receita' | 'despesa';

/** Categorias predefinidas. Personalizadas usam o identificador "custom:<uuid>". */
export const PREDEFINED_CATEGORIES: Record<string, { label: string; kinds: Kind[] }> = {
  salario: { label: 'Salário', kinds: ['receita'] },
  freelance: { label: 'Freelance', kinds: ['receita'] },
  venda_bens: { label: 'Venda de bens', kinds: ['receita'] },
  comissoes: { label: 'Comissões', kinds: ['receita'] },
  rendimentos: { label: 'Rendimentos', kinds: ['receita'] },
  reembolsos: { label: 'Reembolsos', kinds: ['receita'] },
  alimentacao: { label: 'Alimentação', kinds: ['despesa'] },
  transporte: { label: 'Transporte', kinds: ['despesa'] },
  moradia: { label: 'Moradia', kinds: ['despesa'] },
  saude: { label: 'Saúde', kinds: ['despesa'] },
  educacao: { label: 'Educação', kinds: ['despesa'] },
  lazer: { label: 'Lazer', kinds: ['despesa'] },
  compras: { label: 'Compras', kinds: ['despesa'] },
  assinaturas: { label: 'Assinaturas', kinds: ['despesa'] },
  outros: { label: 'Outros', kinds: ['receita', 'despesa'] },
};

export function categoryLabel(slug: string, custom: Map<string, string> = new Map()): string {
  if (slug.startsWith('custom:')) return custom.get(slug.slice(7)) ?? 'Categoria personalizada';
  return PREDEFINED_CATEGORIES[slug]?.label ?? slug;
}
