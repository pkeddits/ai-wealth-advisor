import { FlaskConical } from 'lucide-react';
import { restoreDemoData } from '../../services/demo/bootstrap';
import { clearDemoFinance } from '../../services/finance';
import { clearDemoPlanning } from '../../services/planning';
import { clearDemoData } from '../../services/demo';

export function DemoBanner() {
  const handleClear = () => {
    if (window.confirm('Apagar carteiras, transações, receitas, despesas, metas e orçamentos fictícios deste navegador?')) {
      clearDemoData();
      clearDemoFinance();
      clearDemoPlanning();
      window.location.assign('/dashboard');
    }
  };

  const handleRestore = () => {
    if (window.confirm('Restaurar os dados fictícios iniciais? As alterações feitas neste navegador serão substituídas.')) {
      restoreDemoData();
      window.location.assign('/dashboard');
    }
  };

  return (
    <div className="px-3 pt-[max(env(safe-area-inset-top),10px)] sm:px-6 sm:pt-4 lg:px-8" role="status">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-yellow-500/25 bg-yellow-500/[0.07] px-3.5 py-2 text-sm text-yellow-800 sm:px-4 sm:py-2.5">
        <FlaskConical className="h-4 w-4 shrink-0 text-yellow-500" aria-hidden="true" />
        <p className="min-w-0 flex-1 leading-snug">
          <strong className="font-semibold text-yellow-700">Modo demonstração.</strong>
          <span className="hidden sm:inline"> Dados fictícios salvos só neste navegador. Os preços dos ativos são fixos e não são cotações reais.</span>
          <span className="sm:hidden"> Dados fictícios, só neste navegador.</span>
        </p>
        <button
          type="button"
          onClick={handleRestore}
          className="link-underline shrink-0 whitespace-nowrap font-medium text-yellow-700 hover:text-yellow-600"
        >
          <span className="hidden sm:inline">Restaurar exemplo</span>
          <span className="sm:hidden">Restaurar</span>
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="link-underline shrink-0 whitespace-nowrap font-medium text-yellow-700 hover:text-yellow-600"
          aria-label="Apagar dados da demonstração"
        >
          <span className="hidden sm:inline">Apagar dados da demonstração</span>
          <span className="sm:hidden">Apagar</span>
        </button>
      </div>
    </div>
  );
}
