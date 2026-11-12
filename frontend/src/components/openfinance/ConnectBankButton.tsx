import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Landmark } from 'lucide-react';
import { Button } from '../common';
import { openFinance } from '../../services/openFinance';
import { errorMessage } from '../../lib/errorMessage';

const PluggyConnect = lazy(() => import('react-pluggy-connect').then((m) => ({ default: m.PluggyConnect })));

interface ConnectBankButtonProps {
  /** Conexão existente para reautorizar (atualiza o mesmo Item, sem duplicar dados). */
  connectionId?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
  onConnected: (connectionId: string) => Promise<void> | void;
  onError?: (message: string) => void;
}

export function ConnectBankButton({ connectionId, label = 'Conectar banco', variant = 'primary', size = 'md', icon, className, onConnected, onError }: ConnectBankButtonProps) {
  const [token, setToken] = useState<{ accessToken: string; itemId: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      setToken(await openFinance.connectToken(connectionId));
    } catch (err) {
      onError?.(errorMessage(err, 'Não foi possível iniciar a conexão.'));
      setLoading(false);
    }
  };

  const finish = () => {
    setToken(null);
    setLoading(false);
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={start} loading={loading} className={`shrink-0 whitespace-nowrap ${className ?? ''}`} icon={icon ?? <Landmark className="h-4 w-4" />}>
        {label}
      </Button>
      {token && (
        <Suspense fallback={null}>
          <PluggyConnect
            connectToken={token.accessToken}
            updateItem={token.itemId ?? undefined}
            includeSandbox={import.meta.env.VITE_PLUGGY_INCLUDE_SANDBOX === 'true'}
            language="pt"
            theme={document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}
            onSuccess={async ({ item }) => {
              try {
                const { connectionId: id } = await openFinance.registerItem(item.id);
                finish();
                await onConnected(id);
              } catch (err) {
                finish();
                onError?.(errorMessage(err, 'A conexão foi criada, mas não pôde ser vinculada à sua conta.'));
              }
            }}
            onError={(error) => {
              finish();
              onError?.(error?.message ? `A instituição não concluiu a conexão: ${error.message}` : 'A instituição não concluiu a conexão.');
            }}
            onClose={finish}
            onLoadError={() => {
              finish();
              onError?.('Não foi possível carregar a janela de conexão. Verifique sua internet e tente novamente.');
            }}
          />
        </Suspense>
      )}
    </>
  );
}
