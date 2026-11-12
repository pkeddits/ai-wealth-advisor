import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { planningService, useCustomCategories } from '../../services/planning';
import { CATEGORIES } from '../../services/finance';
import { errorMessage } from '../../lib/errorMessage';
import { Button, Input } from '../../components/common';
import { Segmented, Switch } from '../../components/settings';

export function CategoriesTab() {
  const { list, load } = useCustomCategories();
  const [kind, setKind] = useState<'despesa' | 'receita'>('despesa');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setError('');
    try { await fn(); await load(); } catch (err) { setError(errorMessage(err, 'Não foi possível salvar.')); }
  };

  const predefined = Object.entries(CATEGORIES).filter(([, c]) => c.kinds.includes(kind));
  const custom = list.filter((c) => c.kind === kind);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <section className="panel p-5">
        <Segmented label="Tipo" value={kind} onChange={setKind} options={[{ value: 'despesa', label: 'Despesas' }, { value: 'receita', label: 'Receitas' }]} />
        <p className="mt-4 text-sm font-medium text-dark-900">Predefinidas</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {predefined.map(([slug, c]) => <li key={slug} className="inline-flex items-center gap-1.5 rounded-full border border-dark-200 px-3 py-1 text-sm text-dark-700"><c.icon className="h-3.5 w-3.5 text-dark-500" />{c.label}</li>)}
        </ul>
        <p className="mt-4 text-xs text-dark-500">Transferências entre contas próprias, aplicações e faturas não são receitas nem despesas: elas são identificadas pela natureza do lançamento.</p>
      </section>
      <section className="panel p-5">
        <p className="text-sm font-medium text-dark-900">Suas categorias de {kind === 'despesa' ? 'despesa' : 'receita'}</p>
        <form onSubmit={(e) => { e.preventDefault(); run(async () => { await planningService.createCategory(kind, name); setName(''); }); }} className="mt-3 flex gap-2">
          <Input aria-label="Nome da nova categoria" placeholder="Ex.: Pets" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Button type="submit" disabled={!name.trim()} icon={<Plus className="h-4 w-4" />}>Criar</Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
        {!custom.length ? <p className="mt-4 text-sm text-dark-500">Nenhuma categoria personalizada.</p> : (
          <ul className="mt-4 divide-y divide-dark-200/60">
            {custom.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                {renaming?.id === c.id ? (
                  <form onSubmit={(e) => { e.preventDefault(); run(async () => { await planningService.updateCategory(c.id, { name: renaming.name }); setRenaming(null); }); }} className="flex flex-1 gap-2">
                    <Input aria-label="Novo nome" value={renaming.name} maxLength={40} onChange={(e) => setRenaming({ id: c.id, name: e.target.value })} className="flex-1" autoFocus />
                    <Button type="submit" size="sm">Salvar</Button>
                  </form>
                ) : (
                  <>
                    <span className={c.isActive ? 'flex-1 text-sm text-dark-900' : 'flex-1 text-sm text-dark-500 line-through'}>{c.name}</span>
                    <button type="button" onClick={() => setRenaming({ id: c.id, name: c.name })} className="text-xs text-primary-700 hover:underline">Renomear</button>
                    <Switch checked={c.isActive} onChange={(v) => run(() => planningService.updateCategory(c.id, { isActive: v }))} label={`Ativar ${c.name}`} />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-dark-500">Desativar mantém os lançamentos antigos e orçamentos; a categoria só deixa de aparecer em novos lançamentos.</p>
      </section>
    </div>
  );
}
