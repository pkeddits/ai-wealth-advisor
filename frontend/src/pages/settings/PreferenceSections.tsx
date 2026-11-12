import { Bell, CreditCard, Landmark, LineChart, Palette, Plug, Wallet } from 'lucide-react';
import { usePreferences } from '../../store/preferencesStore';
import { useDisplayFormat } from '../../lib/displayFormat';
import { isSupabaseMode } from '../../config/appMode';
import { ConnectionsManager } from '../../components/openfinance/ConnectionsManager';
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
    <SettingsSection id="notificacoes" title="Notificações" description="Preferências salvas agora; os envios começam quando as notificações forem integradas ao servidor." icon={<Bell className="h-5 w-5" />}>
      <SettingRow title="Notificações por e-mail" description="Resumo de movimentações e avisos da conta.">
        <Switch checked={notifications.email} onChange={toggle('email')} label="Notificações por e-mail" />
      </SettingRow>
      <SettingRow title="Alertas do sistema" description="Avisos sobre a conta e operações recusadas.">
        <Switch checked={notifications.system} onChange={toggle('system')} label="Alertas do sistema" />
      </SettingRow>
      <SettingRow title="Alertas de metas" description="Quando uma meta de aporte estiver próxima ou for atingida.">
        <Switch checked={notifications.goals} onChange={toggle('goals')} label="Alertas de metas" />
      </SettingRow>
      <SettingRow title="Alertas de IA" description="Explicações sobre mudanças relevantes na carteira." status={<span className="chip-planned">Planejado</span>}>
        <Switch checked={false} onChange={() => undefined} disabled label="Alertas de IA" />
      </SettingRow>
      <SettingRow title="Alertas de integrações" description="Falhas ou novas sincronizações do Open Finance." status={<span className="chip-planned">Planejado</span>}>
        <Switch checked={false} onChange={() => undefined} disabled label="Alertas de integrações" />
      </SettingRow>
    </SettingsSection>
  );
}

export function IntegrationsSection() {
  const items = [
    { icon: Landmark, title: 'Contas bancárias', text: 'Saldos, Pix e extratos importados com a sua autorização pelo Open Finance.' },
    { icon: CreditCard, title: 'Cartões de crédito', text: 'Faturas e gastos por categoria, sem precisar digitar cada compra.' },
    { icon: LineChart, title: 'Investimentos em corretoras', text: 'Posições de outras instituições reunidas no seu patrimônio.' },
  ];
  return (
    <SettingsSection id="integracoes" title="Integrações" description="Conexões com as suas instituições financeiras, sempre autorizadas por você." icon={<Plug className="h-5 w-5" />}>
      {isSupabaseMode ? (
        <ConnectionsManager />
      ) : (
        <>
          <p className="pb-4 text-sm text-dark-500">A conexão bancária exige uma conta real. Na demonstração, nenhuma instituição é conectada.</p>
          <div className="grid gap-3 md:grid-cols-3">
            {items.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex flex-col rounded-2xl border border-dark-200/70 bg-dark-50/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-5 w-5 text-primary-700" aria-hidden="true" />
                  <span className="chip-planned">Com conta real</span>
                </div>
                <p className="mt-4 text-sm font-medium text-dark-900">{title}</p>
                <p className="mt-1 text-sm text-dark-500">{text}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </SettingsSection>
  );
}
