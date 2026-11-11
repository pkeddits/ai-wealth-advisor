import { useEffect } from 'react';
import { isDemoMode } from '../config/appMode';
import { readDemoProfile } from '../services/account';
import { useAuthStore } from '../store/authStore';

/** No modo demonstração, aplica ao usuário local as edições de perfil salvas no navegador. */
export function useProfileSync() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!isDemoMode || !user) return;
    const stored = readDemoProfile();
    if (stored && (stored.name !== user.name || stored.riskProfile !== user.riskProfile)) {
      setUser({ ...user, name: stored.name, riskProfile: stored.riskProfile });
    }
  }, [user, setUser]);
}
