import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/** Encerra a sessão e vai ao login sem memorizar a página atual como destino de retorno. */
export function useSignOut() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return useCallback(async () => {
    await logout();
    navigate('/login', { replace: true, state: null });
  }, [logout, navigate]);
}
