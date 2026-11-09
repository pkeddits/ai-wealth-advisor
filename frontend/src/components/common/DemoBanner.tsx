import { Info } from 'lucide-react';
import { clearDemoData } from '../../services/demo';

/** Faixa fixa que identifica o modo demonstração em todas as páginas internas. */
export function DemoBanner() {
  const handleClear = () => {
    if (window.confirm('Apagar todas as carteiras e transações da demonstração neste navegador?')) {
      clearDemoData();
      window.location.assign('/dashboard');
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900" role="status">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-6 py-2 text-sm">
        <p className="flex items-start gap-2 flex-1">
          <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Modo demonstração.</strong> Dados fictícios salvos só neste navegador.
            Os preços dos ativos são fixos e não são cotações reais.
          </span>
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="self-start sm:self-auto shrink-0 rounded-md px-2 py-1 font-medium underline underline-offset-2 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          Apagar dados da demonstração
        </button>
      </div>
    </div>
  );
}
