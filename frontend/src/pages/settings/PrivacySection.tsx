import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Download, FileText, Lock, Trash2 } from 'lucide-react';
import { useSignOut } from '../../hooks/useSignOut';
import { isDemoMode } from '../../config/appMode';
import { clearDemoData } from '../../services/demo';
import { clearDemoProfile, exportDemoData } from '../../services/account';
import { clearDemoFinance } from '../../services/finance';
import { clearDemoPlanning } from '../../services/planning';
import { Button } from '../../components/common';
import { SettingRow, SettingsSection } from '../../components/settings';
import { AiConsent } from '../../components/ai/ChatPanel';

export function PrivacySection() {
  const signOut = useSignOut();
  const [notice, setNotice] = useState(false);

  const clear = () => {
    if (!window.confirm('Apagar todas as carteiras, transações e o perfil da demonstração neste navegador?')) return;
    clearDemoData();
    clearDemoProfile();
    clearDemoFinance();
    clearDemoPlanning();
    window.location.assign('/dashboard');
  };

  const endDemo = async () => {
    if (!window.confirm('Encerrar a demonstração? Os dados fictícios deste navegador serão apagados.')) return;
    clearDemoData();
    clearDemoProfile();
    clearDemoFinance();
    clearDemoPlanning();
    await signOut();
  };

  return (
    <SettingsSection id="privacidade" title="Privacidade e dados" description="Seus dados, avisos e controle sobre a conta." icon={<Lock className="h-5 w-5" />}>
      <div className="py-5 first:pt-0">
        <p className="mb-3 text-sm font-medium text-dark-900">Assistente de IA</p>
        <AiConsent />
      </div>
      <SettingRow title="Projeto acadêmico" description="Desenvolvido para a disciplina ADS II. Não é uma instituição financeira e não oferece recomendação de investimento." />
      <SettingRow
        title="Baixar meus dados"
        description={isDemoMode ? 'Carteiras e transações da demonstração em um arquivo JSON.' : 'Exportação da conta.'}
        status={!isDemoMode && <span className="chip-planned">Em breve</span>}
      >
        <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportDemoData} disabled={!isDemoMode}>Baixar</Button>
      </SettingRow>
      {isDemoMode && (
        <SettingRow title="Limpar dados da demonstração" description="Apaga carteiras, transações, movimentações e perfil fictícios deste navegador.">
          <Button variant="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={clear}>Limpar dados</Button>
        </SettingRow>
      )}
      <SettingRow
        title={isDemoMode ? 'Encerrar demonstração' : 'Excluir conta'}
        description={isDemoMode ? 'Apaga os dados fictícios e encerra a sessão.' : 'A exclusão definitiva exige confirmação pelo servidor e ainda não está disponível.'}
        status={!isDemoMode && <span className="chip-planned">Em breve</span>}
      >
        <Button variant="danger" onClick={endDemo} disabled={!isDemoMode}>{isDemoMode ? 'Encerrar' : 'Excluir conta'}</Button>
      </SettingRow>
      <div className="pt-5">
        <button
          type="button"
          onClick={() => setNotice((v) => !v)}
          aria-expanded={notice}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dark-200/70 bg-dark-50/40 px-4 py-3 text-left text-sm font-medium text-dark-900 transition-colors hover:bg-dark-100/60"
        >
          <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary-700" /> Aviso de uso e privacidade</span>
          <ChevronDown className={`h-4 w-4 text-dark-500 transition-transform duration-300 ${notice ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {notice && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-2 px-4 pt-4 text-sm leading-relaxed text-dark-600">
                <p>No modo demonstração, todos os dados ficam no armazenamento local deste navegador e não são enviados a nenhum servidor.</p>
                <p>Com conta real, os dados são guardados no banco do projeto com regras de acesso que limitam cada usuário aos próprios registros. Nenhuma senha bancária é solicitada ou armazenada.</p>
                <p>Os valores e análises exibidos têm finalidade educacional e não constituem recomendação de investimento.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SettingsSection>
  );
}
