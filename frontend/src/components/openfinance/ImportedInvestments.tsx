import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Landmark } from 'lucide-react';
import clsx from 'clsx';
import type { ImportedInvestment } from '../../types';
import { INVESTMENT_TYPE_LABELS, openFinance } from '../../services/openFinance';
import { useDisplayFormat } from '../../lib/displayFormat';
import { errorMessage } from '../../lib/errorMessage';

export function ImportedInvestments({ note = 'Valores informados pelas instituições. Não somados às carteiras.' }: { note?: string }) {
  const fmt = useDisplayFormat();
  const [all, setItems] = useState<ImportedInvestment[] | null>(null);
  const [showWithdrawn, setShowWithdrawn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    openFinance.investments().then(setItems).catch((err) => {
      setError(errorMessage(err, 'Não foi possível carregar os investimentos importados.'));
      setItems([]);
    });
  }, []);

  if (all === null) return <div className="skeleton h-40 !rounded-panel" />;
  // Status ausente não esconde o registro: só TOTAL_WITHDRAWAL vai para a lista de resgatados.
  const items = all.filter((i) => i.status !== 'TOTAL_WITHDRAWAL');
  const withdrawn = all.filter((i) => i.status === 'TOTAL_WITHDRAWAL');
  const activeTotal = items.reduce((s, i) => s + (i.balance ?? 0), 0);

  return (
    <motion.section className="panel p-5 sm:p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} aria-labelledby="importados-titulo">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="importados-titulo" className="font-display text-lg font-semibold tracking-tight">Investimentos importados</h2>
        <p className="text-xs text-dark-500">{note}</p>
      </div>
      {all.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="chip-planned">{all.length} {all.length === 1 ? 'registro recebido' : 'registros recebidos'}</span>
          <span className="chip-planned">{items.length} {items.length === 1 ? 'posição ativa' : 'posições ativas'}</span>
          {withdrawn.length > 0 && <span className="chip-planned">{withdrawn.length} totalmente {withdrawn.length === 1 ? 'resgatado' : 'resgatados'}</span>}
          {items.length > 0 && <span className="chip-planned sensitive">Valor informado das ativas: {fmt.money(activeTotal)}</span>}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      {!items.length ? (
        <p className="mt-5 rounded-2xl border border-dashed border-dark-200 p-6 text-center text-sm text-dark-500">
          {withdrawn.length ? 'Nenhuma posição ativa: todos os investimentos recebidos foram totalmente resgatados.' : 'Nenhum investimento importado. Conecte uma instituição em Integrações; nem todas compartilham investimentos.'}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-dark-500">
                <th className="pb-3 font-medium">Investimento</th>
                <th className="pb-3 font-medium">Tipo</th>
                <th className="pb-3 text-right font-medium">Quantidade</th>
                <th className="pb-3 text-right font-medium">Valor informado</th>
                <th className="pb-3 text-right font-medium">Aplicado</th>
                <th className="pb-3 text-right font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200/60">
              {items.map((i) => {
                const diff = i.balance !== null && i.amountOriginal !== null && i.amountOriginal > 0 ? i.balance - i.amountOriginal : null;
                return (
                  <tr key={i.id} className="transition-colors hover:bg-dark-100/40">
                    <td className="py-3">
                      <span className="block font-medium text-dark-900">{i.code ?? i.name}{!i.status && <span className="ml-2 text-[11px] font-normal text-dark-500">status não informado</span>}</span>
                      <span className="flex items-center gap-1 text-xs text-dark-500"><Landmark className="h-3 w-3" />{i.institutionName}{i.code && i.code !== i.name ? ` · ${i.name}` : ''}</span>
                    </td>
                    <td className="py-3 text-dark-700">{INVESTMENT_TYPE_LABELS[i.type] ?? i.type}{i.subtype ? <span className="block text-xs text-dark-500">{i.subtype.replace(/_/g, ' ').toLowerCase()}</span> : null}</td>
                    <td className="py-3 text-right text-dark-700">{i.quantity === null ? <span className="text-dark-500">não informada</span> : i.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</td>
                    <td className="py-3 text-right">
                      {i.balance === null ? <span className="text-dark-500">não informado</span> : <span className="sensitive text-dark-900">{fmt.money(i.balance)}</span>}
                      {i.reportedAt && <span className="block text-[11px] text-dark-500">em {fmt.date(i.reportedAt)}</span>}
                    </td>
                    <td className="py-3 text-right">{i.amountOriginal === null ? <span className="text-dark-500">não informado</span> : <span className="sensitive text-dark-700">{fmt.money(i.amountOriginal)}</span>}</td>
                    <td className={clsx('py-3 text-right', diff === null ? 'text-dark-500' : diff >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {diff === null ? '—' : <span className="sensitive">{fmt.signedMoney(diff)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {withdrawn.length > 0 && (
        <div className="mt-5 border-t border-dark-200/60 pt-4">
          <button type="button" onClick={() => setShowWithdrawn((v) => !v)} aria-expanded={showWithdrawn} className="flex items-center gap-2 text-sm font-medium text-dark-700 hover:text-dark-900">
            <ChevronDown className={clsx('h-4 w-4 transition-transform', showWithdrawn && 'rotate-180')} />Totalmente resgatados ({withdrawn.length})
          </button>
          {showWithdrawn && (
            <ul className="mt-3 space-y-2">
              {withdrawn.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-xl border border-dark-200/60 bg-dark-50/40 px-3 py-2 text-sm">
                  <span><span className="text-dark-900">{i.code ?? i.name}</span><span className="block text-xs text-dark-500">{i.institutionName} · {INVESTMENT_TYPE_LABELS[i.type] ?? i.type}</span></span>
                  <span className="text-xs text-dark-500">Resgate total informado pela instituição</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </motion.section>
  );
}
