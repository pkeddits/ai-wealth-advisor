import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, UserRound } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { usePreferences } from '../../store/preferencesStore';
import { updateProfile } from '../../services/account';
import { accountSync } from '../../services/accountSync';
import { appMode } from '../../config/appMode';
import { Avatar, AVATAR_GRADIENTS, Button, Input } from '../../components/common';
import { FormAlert } from '../../components/auth';
import { Segmented, SettingRow, SettingsSection, SavedNote } from '../../components/settings';
import type { User } from '../../types';

const RISK_OPTIONS = [
  { value: 'conservador', label: 'Conservador', hint: 'Prioriza segurança e estabilidade' },
  { value: 'moderado', label: 'Moderado', hint: 'Equilibra risco e retorno' },
  { value: 'arrojado', label: 'Arrojado', hint: 'Aceita oscilações por mais retorno' },
] as const;

export function ProfileSection() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { avatar, set } = usePreferences();
  const [name, setName] = useState(user?.name ?? '');
  const [risk, setRisk] = useState<User['riskProfile']>(user?.riskProfile ?? 'moderado');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(user?.name ?? '');
    setRisk(user?.riskProfile ?? 'moderado');
  }, [user?.name, user?.riskProfile]);

  if (!user) return null;
  const dirty = name.trim() !== user.name || risk !== user.riskProfile;

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      setUser(await updateProfile(user, { name, riskProfile: risk }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setPhotoBusy(true);
    try {
      await accountSync.uploadAvatar(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível usar a imagem.');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const hasPhoto = avatar.kind !== 'gradient';
  const chooseGradient = async (index: number) => {
    setError('');
    try {
      if (hasPhoto) await accountSync.removeAvatar();
      set('avatar', { kind: 'gradient', index });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o avatar.');
    }
  };

  const removePhoto = async () => {
    setError('');
    setPhotoBusy(true);
    try {
      await accountSync.removeAvatar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover a foto.');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <SettingsSection id="perfil" title="Perfil" description="Como você aparece no Wealth Advisor." icon={<UserRound className="h-5 w-5" />}>
      <div className="flex flex-col gap-5 pb-6 sm:flex-row sm:items-center">
        <Avatar name={name || user.name} size="lg" className="shadow-[0_16px_40px_-16px_rgb(var(--violet)/0.8)]" />
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor do avatar">
            {AVATAR_GRADIENTS.map((gradient, index) => {
              const active = avatar.kind === 'gradient' && avatar.index === index;
              return (
                <button
                  key={gradient}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`Cor ${index + 1}`}
                  onClick={() => chooseGradient(index)}
                  className={clsx('h-8 w-8 rounded-full transition-transform hover:scale-110', active && 'ring-2 ring-primary-500 ring-offset-2 ring-offset-surface')}
                  style={{ background: gradient }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button size="sm" variant="secondary" icon={<ImagePlus className="h-4 w-4" />} loading={photoBusy} onClick={() => fileRef.current?.click()}>
              Enviar foto
            </Button>
            {hasPhoto && (
              <Button size="sm" variant="ghost" icon={<Trash2 className="h-4 w-4" />} disabled={photoBusy} onClick={removePhoto}>
                Remover foto
              </Button>
            )}
          </div>
          <p className="text-xs text-dark-500">{appMode === 'supabase' ? 'JPG, PNG ou WebP. A foto fica na sua conta e aparece em todos os seus dispositivos.' : 'Na demonstração, a foto fica salva apenas neste navegador.'}</p>
        </div>
      </div>

      <div className="grid gap-5 py-6 md:grid-cols-2">
        <Input id="settings-name" label="Nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <Input id="settings-email" label="E-mail" value={user.email} disabled helperText="A alteração de e-mail exige confirmação e ainda não está disponível." />
      </div>

      <SettingRow title="Perfil de investidor" description="Usado para contextualizar análises futuras.">
        <Segmented label="Perfil de investidor" value={risk} onChange={setRisk} options={[...RISK_OPTIONS]} />
      </SettingRow>

      <div className="flex flex-wrap items-center justify-end gap-4 pt-6">
        {error && <div className="w-full"><FormAlert>{error}</FormAlert></div>}
        <SavedNote show={saved}>Perfil salvo</SavedNote>
        <Button onClick={save} loading={saving} disabled={!dirty}>Salvar perfil</Button>
      </div>
    </SettingsSection>
  );
}
