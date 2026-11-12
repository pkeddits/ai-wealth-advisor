import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Landmark } from 'lucide-react';
import type { BankConnection, ImportedInvestment } from '../../types';
import { openFinance } from '../../services/openFinance';
import { useDisplayFormat } from '../../lib/displayFormat';
import { spotlightHandler } from '../../hooks/useSpotlight';

export function OpenFinanceSummary() {
  const fmt = useDisplayFormat();
  const [data, setData] = useState<{ connections: BankConnection[]; investments: ImportedInvestment[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([openFinance.connections(), openFinance.investments()])
      .then(([connections, investments]) => setData({ connections, investments }))
      .catch(() => setFailed(true));
  }, []);

  if (failed || !data) return null;

  if (!data.connections.length) {
    return (
      <motion.section onPointerMove={spotlightHandler} className="panel spotlight flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary-500/40 bg-primary-500/10 text-primary-700"><Landmark className="h-5 w-5" /></span>
        <div className="flex-1">
          <p className="font-medium text-dark-900">Conecte suas contas pelo Open Finance</p>
          <p className="text-sm text-dark-500">Saldos, movimentações e investimentos importados com a sua autorização. O cadastro manual continua disponível.</p>
        </div>
        <Link to="/settings#integracoes" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline">Conectar banco <ArrowRight className="h-4 w-4" /></Link>
      </motion.section>
    );
  }

  const bankAccounts = data.connections.flatMap((c) => c.accounts.filter((a) => a.kind === 'BANK' && a.balance !== null));
  const bankTotal = bankAccounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const known = data.investments.filter((i) => i.balance !== null);
  const investedTotal = known.reduce((s, i) => s + (i.balance ?? 0), 0);
  const stale = data.connections.some((c) => c.lastSyncError || c.status !== 'UPDATED');
  const lastSync = data.connections.map((c) => c.lastSyncedAt).filter(Boolean).sort().pop();

  return (
    <motion.section className="panel grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} aria-label="Contas conectadas">
      <div>
        <p className="text-sm text-dark-500">Saldo em contas ({bankAccounts.length})</p>
        <p className="sensitive mt-1 text-2xl font-semibold tracking-tight text-dark-900">{fmt.money(bankTotal)}</p>
        <p className="text-xs text-dark-500">Informado pelas instituições. Não é o saldo do mês.</p>
      </div>
      <div>
        <p className="text-sm text-dark-500">Investimentos importados ({data.investments.length})</p>
        <p className="sensitive mt-1 text-2xl font-semibold tracking-tight text-dark-900">{fmt.money(investedTotal)}</p>
        <p className="text-xs text-dark-500">{known.length < data.investments.length ? `${data.investments.length - known.length} sem valor informado. ` : ''}Separado do patrimônio das carteiras.</p>
      </div>
      <div className="text-sm sm:text-right">
        <p className={stale ? 'text-yellow-700' : 'text-dark-500'}>{stale ? 'Dados possivelmente desatualizados' : 'Sincronizado'}{lastSync ? ` em ${new Date(lastSync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}</p>
        <Link to="/settings#integracoes" className="mt-1 inline-flex items-center gap-1 font-medium text-primary-700 hover:underline">Gerenciar <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </motion.section>
  );
}
