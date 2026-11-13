import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { userSettings } from '../../services/userSettings';
import { CheckCircle2, GraduationCap, PlayCircle } from 'lucide-react';
import { SettingRow, SettingsSection, Switch } from '../../components/settings';
import { usePreferences } from '../../store/preferencesStore';
import { TUTORIALS } from '../../tutorials/content';
import { useTutorial } from '../../components/tutorial/TutorialHost';

export function TutorialsSection() {
  const { tutorialsAuto, tutorialsSeen, set } = usePreferences();
  const open = useTutorial((s) => s.open);
  const [nextLogin, setNextLogin] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { userSettings.tutorialsOnNextLogin().then(setNextLogin).catch(() => setNextLogin(false)); }, []);
  const toggleNextLogin = async (value: boolean) => {
    setError('');
    setNextLogin(value);
    try { await userSettings.setTutorialsOnNextLogin(value); }
    catch (err) { setNextLogin(!value); setError(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
  };
  return (
    <SettingsSection id="tutoriais" title="Tutoriais e ajuda" description="Guias rápidos de cada área, com telas reais do produto." icon={<GraduationCap className="h-5 w-5" />}>
      <SettingRow title="Mostrar o guia ao abrir uma área pela primeira vez" description="Você também pode abrir o guia a qualquer momento pelo botão Guia, no topo da página.">
        <Switch checked={tutorialsAuto} onChange={(v) => set('tutorialsAuto', v)} label="Mostrar guias automaticamente" />
      </SettingRow>
      <SettingRow title="Mostrar tutoriais no próximo login" description="Na próxima vez que você entrar, cada guia aparece ao abrir a respectiva área. A opção é desativada depois de aplicada; atualizar a página não a consome.">
        <Switch checked={Boolean(nextLogin)} onChange={toggleNextLogin} disabled={nextLogin === null} label="Mostrar tutoriais no próximo login" />
      </SettingRow>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <ul className="grid gap-3 py-5 sm:grid-cols-2">
        {TUTORIALS.map((t, i) => {
          const done = tutorialsSeen.includes(t.id);
          return (
            <motion.li key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <button type="button" onClick={() => open(t.id)} className="lift group flex w-full items-center gap-3 rounded-2xl border border-dark-200/70 bg-dark-50/40 p-2.5 text-left transition-colors hover:border-primary-500/40">
                <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-dark-200/70 bg-dark-100">
                  <img src={t.steps[0].image} alt="" loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />
                  <PlayCircle className="absolute inset-0 m-auto h-6 w-6 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-dark-900">{t.title}{done && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-label="Concluído" />}</span>
                  <span className="block truncate text-xs text-dark-500">{t.summary}</span>
                  <span className="text-[11px] text-dark-500">{t.steps.length} {t.steps.length === 1 ? 'etapa' : 'etapas'}</span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
      <div className="pb-1">
        <button type="button" onClick={() => set('tutorialsSeen', [])} className="text-sm font-medium text-primary-700 hover:underline">Recomeçar todos os guias</button>
      </div>
    </SettingsSection>
  );
}
