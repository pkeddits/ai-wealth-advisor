/**
 * Classificação dos erros do Open Finance (Pluggy), compartilhada entre servidor e widget.
 * Recebe códigos e mensagens do provedor e devolve uma explicação amigável, sem detalhes internos.
 */
export type OpenFinanceErrorKind = 'trial' | 'credentials' | 'institution' | 'authorization' | 'config' | 'generic';

export interface OpenFinanceErrorInfo {
  kind: OpenFinanceErrorKind;
  title: string;
  message: string;
}

const RULES: { kind: OpenFinanceErrorKind; pattern: RegExp }[] = [
  { kind: 'trial', pattern: /TRIAL_CLIENT|TRIAL_|\btrial\b/i },
  { kind: 'config', pattern: /CLIENT_ID|CLIENT_SECRET|INVALID_API_KEY|API_KEY|UNAUTHORIZED_CLIENT|n[ãa]o configurad/i },
  { kind: 'credentials', pattern: /INVALID_CREDENTIALS|ALREADY_LOGGED_IN|ACCOUNT_LOCKED|LOGIN_ERROR|INVALID_PASSWORD|MFA|senha|credencia/i },
  { kind: 'authorization', pattern: /USER_AUTHORIZATION|AUTHORIZATION_NOT_GRANTED|ACCOUNT_NEEDS_ACTION|WAITING_USER|CONSENT|consentimento|autoriza/i },
  { kind: 'institution', pattern: /SITE_NOT_AVAILABLE|CONNECTION_ERROR|CONNECTOR|INSTITUTION|INSTITUI|PROVIDER_ERROR|indispon/i },
];

const TEXT: Record<OpenFinanceErrorKind, Omit<OpenFinanceErrorInfo, 'kind'>> = {
  trial: {
    title: 'Instituições reais ainda não liberadas',
    message: 'Esta aplicação usa o ambiente de testes da Pluggy, que só permite conectar o Pluggy Bank com dados fictícios. A conexão com bancos reais será habilitada após a aprovação do acesso de produção.',
  },
  config: {
    title: 'Integração indisponível no momento',
    message: 'As credenciais da aplicação junto ao provedor de Open Finance não foram aceitas. Nenhum dado seu foi afetado; tente novamente mais tarde.',
  },
  credentials: {
    title: 'Não foi possível entrar na instituição',
    message: 'A instituição recusou os dados de acesso informados na janela de conexão. Confira usuário, senha ou código de verificação e tente de novo.',
  },
  authorization: {
    title: 'Autorização não concluída',
    message: 'O compartilhamento de dados não foi autorizado na instituição. Abra a conexão novamente e conclua a autorização no aplicativo ou site do seu banco.',
  },
  institution: {
    title: 'Instituição indisponível',
    message: 'A instituição não respondeu como esperado. Isso costuma ser temporário; tente novamente em alguns minutos.',
  },
  generic: {
    title: 'Conexão não concluída',
    message: 'Não foi possível concluir a conexão. Tente novamente; se o problema continuar, escolha outra instituição.',
  },
};

export function classifyOpenFinanceError(...signals: (string | null | undefined)[]): OpenFinanceErrorInfo {
  const text = signals.filter(Boolean).join(' ');
  const kind = RULES.find((r) => r.pattern.test(text))?.kind ?? 'generic';
  return { kind, ...TEXT[kind] };
}

/** Extrai códigos de erro de objetos vindos do provedor ou do widget (formatos variam entre versões). */
export function providerErrorSignals(value: unknown, depth = 0): string[] {
  if (!value || depth > 3) return [];
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object') return [];
  const out: string[] = [];
  for (const key of ['codeDescription', 'code', 'message', 'status', 'executionStatus', 'error', 'data', 'item']) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object') out.push(...providerErrorSignals(v, depth + 1));
  }
  return out;
}
