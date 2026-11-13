import { ArrowRight, Bell, Palette, Plug, Wallet } from 'lucide-react';
import { usePreferences } from '../../store/preferencesStore';
import { useDisplayFormat } from '../../lib/displayFormat';
import { isSupabaseMode } from '../../config/appMode';
import { Link } from 'react-router-dom';
import { Button, Select } from '../../components/common';
import { Segmented, SettingRow, SettingsSection, Switch } from '../../components/settings';

export function AppearanceSection() {
  const { theme, motion, density, effects, set, reset } = usePreferences();
  return (
    <SettingsSection id="aparencia" title="Aparência" description="As mudanças são aplicadas na hora e salvas neste navegador." icon={<Palette className="h-5 w-5" />}>
      <SettingRow title="Tema" description="Sistema acompanha a configuração do seu dispositivo.">
        <Segmented label="Tema" value={theme} onChange={(v) => set('theme', v)} options={[{ value: 'dark', label: 'Escuro' }, { value: 'system', label: 'Sistema' }, { value: 'light', label: 'Claro' }]} />
      </SettingRow>
      <SettingRow title="Animações" description="Reduzida mantém transições curtas e desliga flutuação e parallax. Desligada remove todo o movimento.">
        <Segmented label="Animações" value={motion} onChange={(v) => set('motion', v)} options={[{ value: 'full', label: 'Completa' }, { value: 'reduced', label: 'Reduzida' }, { value: 'off', label: 'Desligada' }]} />
      </SettingRow>
      <SettingRow title="Densidade" description="Compacta reduz espaçamentos e tamanhos para caber mais informação.">
        <Segmented label="Densidade" value={density} onChange={(v) => set('density', v)} options={[{ value: 'comfortable', label: 'Confortável' }, { value: 'compact', label: 'Compacta' }]} />
      </SettingRow>
      <SettingRow title="Efeitos visuais premium" description="Brilhos, desfoque de vidro e iluminação decorativa. Desligar pode melhorar o desempenho.">
        <Switch checked={effects} onChange={(v) => set('effects', v)} label="Efeitos visuais premium" />
      </SettingRow>
      <SettingRow title="Restaurar padrões" description="Volta todas as preferências de aparência, finanças e notificações ao padrão.">
        <Button variant="ghost" onClick={reset}>Restaurar</Button>
      </SettingRow>
    </SettingsSection>
  );
}

export function FinanceSection() {
  const { dateFormat, valueDisplay, returnDisplay, homePage, set } = usePreferences();
  const fmt = useDisplayFormat();
  const sampleDate = new Date().toISOString().slice(0, 10);
  return (
    <SettingsSection id="financas" title="Preferências financeiras" description="Aplicadas ao painel e à lista de carteiras." icon={<Wallet className="h-5 w-5" />}>
      <SettingRow title="Moeda" description="Outras moedas dependem de cotações de câmbio, ainda não integradas.">
        <div className="w-56">
          <Select aria-label="Moeda" value="BRL" onChange={() => undefined} options={[{ value: 'BRL', label: 'Real brasileiro (R$)' }]} />
        </div>
      </SettingRow>
      <SettingRow title="Formato de data" description={`Exemplo: ${fmt.date(sampleDate)}`}>
        <Segmented label="Formato de data" value={dateFormat} onChange={(v) => set('dateFormat', v)} options={[{ value: 'dd/mm/aaaa', label: 'dd/mm/aaaa' }, { value: 'aaaa-mm-dd', label: 'aaaa-mm-dd' }, { value: 'extenso', label: 'Por extenso' }]} />
      </SettingRow>
      <SettingRow title="Valores" description={`Exemplo: ${fmt.money(26717.4)}`}>
        <Segmented label="Valores" value={valueDisplay} onChange={(v) => set('valueDisplay', v)} options={[{ value: 'full', label: 'Completos' }, { value: 'rounded', label: 'Arredondados' }]} />
      </SettingRow>
      <SettingRow title="Rentabilidade" description={`Exemplo: ${fmt.result(840, 3.25)}`}>
        <Segmented label="Rentabilidade" value={returnDisplay} onChange={(v) => set('returnDisplay', v)} options={[{ value: 'percent', label: 'Percentual' }, { value: 'absolute', label: 'Valor' }, { value: 'both', label: 'Ambos' }]} />
      </SettingRow>
      <SettingRow title="Página inicial" description="Para onde você vai depois de entrar.">
        <Segmented label="Página inicial" value={homePage} onChange={(v) => set('homePage', v)} options={[{ value: '/dashboard', label: 'Visão geral' }, { value: '/portfolios', label: 'Carteiras' }]} />
      </SettingRow>
    </SettingsSection>
  );
}

export function NotificationsSection() {
  const { notifications, set } = usePreferences();
  const toggle = (key: keyof typeof notifications) => (value: boolean) => set('notifications', { ...notifications, [key]: value });
  return (
    <SettingsSection id="notificacoes" title="Notificações" description="Escolha quais alertas aparecem na página Alertas. O envio por e-mail estará disponível em breve." icon={<Bell className="h-5 w-5" />}>
      <SettingRow title="Notificações por e-mail" description="Resumo de movimentações e avisos da conta." status={<span className="chip-planned">Em breve</span>}>
        <Switch checked={false} onChange={() => undefined} disabled label="Notificações por e-mail" />
      </SettingRow>
      <SettingRow title="Alertas de orçamento e carteira" description="Orçamentos perto do limite, concentração e cotações pendentes.">
        <Switch checked={notifications.system} onChange={toggle('system')} label="Alertas do sistema" />
      </SettingRow>
      <SettingRow title="Alertas de metas" description="Quando uma meta de aporte estiver próxima ou for atingida.">
        <Switch checked={notifications.goals} onChange={toggle('goals')} label="Alertas de metas" />
      </SettingRow>
      <SettingRow title="Alertas de integrações" description="Instituições que precisam de nova autorização, falhas de sincronização e dados desatualizados.">
        <Switch checked={notifications.integrations !== false} onChange={toggle('integrations')} label="Alertas de integrações" />
      </SettingRow>
    </SettingsSection>
  );
}

export function IntegrationsSection() {
  return (
    <SettingsSection id="integracoes" title="Integrações" description="Conexões com as suas instituições financeiras, sempre autorizadas por você." icon={<Plug className="h-5 w-5" />}>
      <div className="flex flex-col gap-3 rounded-2xl border border-primary-500/25 bg-primary-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-dark-700">Conecte, sincronize, reconecte ou desvincule instituições na Central de Integrações.</p>
        <Link to="/integracoes" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand">Abrir Central de Integrações <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </SettingsSection>
  );
}
