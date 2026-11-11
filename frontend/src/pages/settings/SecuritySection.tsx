import { useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { isDemoMode } from '../../config/appMode';
import { changePassword } from '../../services/account';
import { useSignOut } from '../../hooks/useSignOut';
import { Button } from '../../components/common';
import { FormAlert, PasswordInput } from '../../components/auth';
import { SettingRow, SettingsSection, Switch } from '../../components/settings';

export function SecuritySection() {
  const user = useAuthStore((s) => s.user);
  const signOut = useSignOut();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return setError('A nova senha precisa de ao menos 8 caracteres, com letras e números.');
    if (next !== confirm) return setError('A confirmação não coincide com a nova senha.');
    if (!user) return;
    setSaving(true);
    try {
      await changePassword(user, current, next);
      setSuccess('Senha alterada.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar a senha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection id="seguranca" title="Conta e segurança" description="Senha, sessão e proteção da conta." icon={<ShieldCheck className="h-5 w-5" />}>
      <div className="pb-6">
        <p className="text-sm font-medium text-dark-900">Alterar senha</p>
        {isDemoMode ? (
          <p className="mt-1 text-sm text-dark-500">O modo demonstração não usa senha. A troca fica disponível com uma conta real.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3" noValidate>
            <PasswordInput id="current-password" label="Senha atual" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            <PasswordInput id="new-password" label="Nova senha" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            <PasswordInput id="confirm-password" label="Confirmar nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            <div className="flex flex-wrap items-center justify-end gap-3 md:col-span-3">
              {error && <div className="w-full"><FormAlert>{error}</FormAlert></div>}
              {success && <div className="w-full"><FormAlert tone="success">{success}</FormAlert></div>}
              <Button type="submit" loading={saving} disabled={!current || !next || !confirm}>Alterar senha</Button>
            </div>
          </form>
        )}
      </div>
      <SettingRow title="Verificação em duas etapas" description="Código adicional ao entrar." status={<span className="chip-planned">Em breve</span>}>
        <Switch checked={false} onChange={() => undefined} disabled label="Verificação em duas etapas" />
      </SettingRow>
      <SettingRow title="Sessão" description={`Conectado como ${user?.email ?? ''}.`}>
        <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={signOut}>Sair da conta</Button>
      </SettingRow>
    </SettingsSection>
  );
}
