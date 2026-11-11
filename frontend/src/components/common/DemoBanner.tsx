import { FlaskConical } from 'lucide-react';
import { clearDemoData } from '../../services/demo';

export function DemoBanner() {
  const handleClear = () => {
    if (window.confirm('Apagar todas as carteiras e transações da demonstração neste navegador?')) {
      clearDemoData();
      window.location.assign('/dashboard');
    }
  };

  return (
    <div className="px-4 pt-4 sm:px-6 lg:px-8" role="status">
      <div className="flex flex-col gap-2 rounded-2xl border border-yellow-500/25 bg-yellow-500/[0.07] px-4 py-2.5 text-sm text-yellow-800 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex flex-1 items-start gap-2.5">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-yellow-700">Modo demonstração.</strong> Dados fictícios salvos só neste
            navegador. Os preços dos ativos são fixos e não são cotações reais.
          </span>
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="link-underline self-start whitespace-nowrap font-medium text-yellow-700 hover:text-yellow-600 sm:self-auto"
        >
          Apagar dados da demonstração
        </button>
      </div>
    </div>
  );
}
