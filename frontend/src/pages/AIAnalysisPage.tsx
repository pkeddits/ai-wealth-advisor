import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, RefreshCw, Sparkles } from 'lucide-react';
import { isSupabaseMode } from '../config/appMode';
import { usePreferences } from '../store/preferencesStore';
import { fetchSnapshot, streamChat } from '../services/assistant';
import { Button, Modal } from '../components/common';
import { ChatPanel, AiConsent } from '../components/ai/ChatPanel';
import { ConversationList } from '../components/ai/ConversationList';
import { Markdown } from '../components/ai/Markdown';
import { useInsights } from './insights/useInsights';
import { InsightCard } from './insights/InsightCard';

export function AIAnalysisPage() {
  const { insights, error } = useInsights();
  const { aiEnabled, aiShareData } = usePreferences();
  const [diagnosis, setDiagnosis] = useState('');
  const [state, setState] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle');
  const [diagError, setDiagError] = useState('');
  const [sent, setSent] = useState<unknown | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const generate = async () => {
    setDiagnosis('');
    setDiagError('');
    setState('streaming');
    const c = new AbortController();
    ctrl.current = c;
    try {
      await streamChat({ messages: [], intent: 'diagnosis', page: 'analise', includeData: true, signal: c.signal, onDelta: (t) => setDiagnosis((d) => d + t) });
      setState('done');
    } catch (err) {
      if (c.signal.aborted) setState('done');
      else { setDiagError(err instanceof Error ? err.message : 'Não foi possível gerar o diagnóstico.'); setState('error'); }
    }
  };

  const canDiagnose = isSupabaseMode && aiEnabled && aiShareData;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-dark-500">Inteligência</p>
          <h1 className="text-display mt-1 text-[2rem] leading-tight sm:text-[2.4rem]">Análise IA</h1>
          <p className="mt-1 max-w-2xl text-dark-600">Os indicadores são calculados pelo sistema. A IA explica os resultados e responde dúvidas; ela não faz cálculos nem recomenda compras ou vendas.</p>
        </div>
        {isSupabaseMode && (
          <Button variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={async () => { try { setSent((await fetchSnapshot()).data); } catch (err) { setSent({ erro: err instanceof Error ? err.message : 'indisponível' }); } }}>Ver dados enviados</Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <section className="panel-feature overflow-hidden p-6" aria-labelledby="diag-titulo">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary-500/20 blur-[80px]" aria-hidden="true" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <h2 id="diag-titulo" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"><Sparkles className="h-5 w-5 text-primary-700" />Diagnóstico do período</h2>
              {canDiagnose && (state === 'streaming'
                ? <Button size="sm" variant="secondary" onClick={() => ctrl.current?.abort()}>Interromper</Button>
                : <Button size="sm" onClick={generate} icon={<RefreshCw className="h-4 w-4" />}>{state === 'idle' ? 'Gerar diagnóstico' : 'Atualizar diagnóstico'}</Button>)}
            </div>
            <div className="relative mt-4 text-[15px] text-dark-700" aria-live="polite">
              {!canDiagnose ? (
                <div className="space-y-3"><p className="text-sm text-dark-600">Para gerar o diagnóstico, ative o assistente e o envio do resumo financeiro.</p><AiConsent /></div>
              ) : state === 'idle' ? (
                <p className="text-sm text-dark-500">Clique em "Gerar diagnóstico" para uma leitura curta do mês, com base nos indicadores abaixo.</p>
              ) : (
                <>
                  {diagnosis ? <Markdown text={diagnosis} /> : state === 'streaming' && <p className="text-sm text-dark-500">Analisando os indicadores…</p>}
                  {diagError && <p className="mt-2 text-sm text-red-600" role="alert">{diagError}</p>}
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="insights-titulo">
            <h2 id="insights-titulo" className="mb-3 text-[15px] font-semibold">Indicadores e pontos de atenção</h2>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            {insights === null ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 !rounded-panel" />)}</div> : insights.length ? (
              <ul className="space-y-3">{insights.map((i, n) => <InsightCard key={i.key} insight={i} index={n} />)}</ul>
            ) : <p className="panel p-6 text-sm text-dark-500">Sem pontos de atenção para o período. Registre movimentações, metas ou orçamentos para gerar indicadores.</p>}
          </section>
        </div>

        <motion.section className="panel flex h-[640px] flex-col overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} aria-label="Conversa com o assistente">
          <header className="flex items-center gap-2 border-b border-dark-200/60 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-on-brand"><Sparkles className="h-4 w-4" /></span>
            <p className="text-sm font-semibold text-dark-900">Pergunte ao assistente</p>
          </header>
          <div className="grid min-h-0 flex-1 md:grid-cols-[200px_minmax(0,1fr)]">
            {isSupabaseMode && aiEnabled && <ConversationList className="hidden border-r border-dark-200/60 md:flex" />}
            <ChatPanel page="analise" className={isSupabaseMode && aiEnabled ? 'min-h-0' : 'min-h-0 md:col-span-2'} />
          </div>
        </motion.section>
      </div>

      <Modal isOpen={sent !== null} onClose={() => setSent(null)} title="Dados enviados à IA" size="lg">
        <p className="mb-3 text-sm text-dark-600">Este é o resumo calculado que acompanha suas perguntas quando o envio está ativado. Não inclui descrições de transações, contas, documentos ou dados de outras pessoas.</p>
        <pre className="max-h-[60vh] overflow-auto rounded-2xl border border-dark-200 bg-dark-50/60 p-4 text-xs text-dark-700">{JSON.stringify(sent, null, 2)}</pre>
      </Modal>
    </div>
  );
}
