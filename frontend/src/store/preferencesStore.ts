import { create } from 'zustand';

export type ThemePreference = 'dark' | 'system' | 'light';
export type MotionPreference = 'full' | 'reduced' | 'off';
export type DensityPreference = 'comfortable' | 'compact';
export type DateFormatPreference = 'dd/mm/aaaa' | 'aaaa-mm-dd' | 'extenso';
export type ValueDisplayPreference = 'full' | 'rounded';
export type ReturnDisplayPreference = 'percent' | 'absolute' | 'both';
export type HomePagePreference = '/dashboard' | '/portfolios';

export interface NotificationPreferences {
  email: boolean;
  system: boolean;
  goals: boolean;
  integrations?: boolean;
}

/** Gradiente com iniciais, foto da conta (Supabase Storage) ou imagem local da demonstração. */
export type AvatarPreference = { kind: 'gradient'; index: number } | { kind: 'photo'; path: string } | { kind: 'image'; dataUrl: string };

export interface Preferences {
  theme: ThemePreference;
  motion: MotionPreference;
  density: DensityPreference;
  effects: boolean;
  /** Desfoca valores financeiros na tela. */
  hideValues: boolean;
  /** Uso do assistente (provedor externo) e envio do resumo financeiro calculado. */
  aiEnabled: boolean;
  aiShareData: boolean;
  /** Guias por área: abrir na primeira visita, quais já foram vistos e quais a conta pediu para reapresentar. */
  tutorialsAuto: boolean;
  tutorialsSeen: string[];
  tutorialsReplay: string[];
  dashboardView: 'investimentos' | 'financas';
  dateFormat: DateFormatPreference;
  valueDisplay: ValueDisplayPreference;
  returnDisplay: ReturnDisplayPreference;
  homePage: HomePagePreference;
  notifications: NotificationPreferences;
  avatar: AvatarPreference;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  motion: 'full',
  density: 'comfortable',
  effects: true,
  hideValues: false,
  aiEnabled: false,
  aiShareData: false,
  tutorialsAuto: true,
  tutorialsSeen: [],
  tutorialsReplay: [],
  dashboardView: 'investimentos',
  dateFormat: 'dd/mm/aaaa',
  valueDisplay: 'full',
  returnDisplay: 'both',
  homePage: '/dashboard',
  notifications: { email: false, system: true, goals: true, integrations: true },
  avatar: { kind: 'gradient', index: 0 },
};

/** Chaves gravadas na coluna preferences. Guias e foto têm colunas próprias. */
export const SYNCED_KEYS = [
  'theme', 'motion', 'density', 'effects', 'hideValues', 'aiEnabled', 'aiShareData', 'tutorialsAuto',
  'dashboardView', 'dateFormat', 'valueDisplay', 'returnDisplay', 'homePage', 'notifications',
] as const satisfies readonly (keyof Preferences)[];

export type SyncedKey = (typeof SYNCED_KEYS)[number];
export type SyncStatus = 'local' | 'loading' | 'ready' | 'saving' | 'error';

const ENUMS: Partial<Record<SyncedKey, readonly string[]>> = {
  theme: ['dark', 'system', 'light'],
  motion: ['full', 'reduced', 'off'],
  density: ['comfortable', 'compact'],
  dashboardView: ['investimentos', 'financas'],
  dateFormat: ['dd/mm/aaaa', 'aaaa-mm-dd', 'extenso'],
  valueDisplay: ['full', 'rounded'],
  returnDisplay: ['percent', 'absolute', 'both'],
  homePage: ['/dashboard', '/portfolios'],
};

/** Aceita apenas valores conhecidos; qualquer coisa inesperada (de outra versão ou editada) é ignorada. */
export function sanitizePreferences(input: unknown): Partial<Preferences> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  const out: Partial<Record<keyof Preferences, unknown>> = {};
  for (const key of SYNCED_KEYS) {
    const value = raw[key];
    if (value === undefined) continue;
    const allowed = ENUMS[key];
    if (allowed) {
      if (typeof value === 'string' && allowed.includes(value)) out[key] = value;
    } else if (key === 'notifications') {
      if (value && typeof value === 'object') {
        const n = value as Record<string, unknown>;
        out.notifications = Object.fromEntries(Object.entries(DEFAULT_PREFERENCES.notifications).map(([k, d]) => [k, typeof n[k] === 'boolean' ? n[k] : d]));
      }
    } else if (typeof value === 'boolean') {
      out[key] = value;
    }
  }
  if (typeof raw.avatarGradient === 'number' && Number.isInteger(raw.avatarGradient) && raw.avatarGradient >= 0 && raw.avatarGradient < 32) {
    out.avatar = { kind: 'gradient', index: raw.avatarGradient };
  }
  return out as Partial<Preferences>;
}

const CACHE_PREFIX = 'aiwa.preferences.v2:';
const LEGACY_KEY = 'aiwa.preferences.v1';

function readCache(scope: string): Partial<Preferences> {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + scope);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const base = sanitizePreferences(parsed);
      if (Array.isArray(parsed.tutorialsSeen)) base.tutorialsSeen = parsed.tutorialsSeen.filter((v): v is string => typeof v === 'string');
      if (Array.isArray(parsed.tutorialsReplay)) base.tutorialsReplay = parsed.tutorialsReplay.filter((v): v is string => typeof v === 'string');
      const avatar = parsed.avatar as AvatarPreference | undefined;
      if (avatar?.kind === 'photo' && typeof avatar.path === 'string') base.avatar = avatar;
      if (avatar?.kind === 'image' && typeof avatar.dataUrl === 'string' && scope === 'demo') base.avatar = avatar;
      if (avatar?.kind === 'gradient' && typeof avatar.index === 'number') base.avatar = avatar;
      return base;
    }
    // A demonstração herda as preferências da versão anterior, que eram sempre deste navegador.
    if (scope === 'demo') {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null')?.state;
      if (legacy) {
        const migrated = { ...sanitizePreferences(legacy), tutorialsSeen: Array.isArray(legacy.tutorialsSeen) ? legacy.tutorialsSeen : [] } as Partial<Preferences>;
        if (legacy.avatar?.kind === 'image' || legacy.avatar?.kind === 'gradient') migrated.avatar = legacy.avatar;
        return migrated;
      }
    }
  } catch {
    // Cache corrompido: segue com os padrões.
  }
  return {};
}

function pickPreferences(state: Preferences): Preferences {
  return Object.fromEntries(Object.keys(DEFAULT_PREFERENCES).map((k) => [k, state[k as keyof Preferences]])) as unknown as Preferences;
}

/** Recebe cada alteração feita pela interface; registrado pelo serviço de sincronização da conta. */
type ChangeSink = <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
let sink: ChangeSink | null = null;
export function setPreferencesSink(next: ChangeSink | null) {
  sink = next;
}

interface PreferencesState extends Preferences {
  /** Dono das preferências em memória: "demo", "device" ou "user:<id>". Null antes do login. */
  scope: string | null;
  /** True quando o estado reflete a conta (ou o armazenamento local, fora do Supabase). */
  accountLoaded: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
  /** Troca o dono das preferências sem deixar valores da conta anterior visíveis. */
  switchScope: (scope: string | null, loaded: boolean) => void;
  /** Aplica valores vindos do servidor, sem disparar nova gravação. */
  apply: (values: Partial<Preferences>, status?: SyncStatus) => void;
  setSync: (status: SyncStatus, error?: string | null) => void;
}

function writeCache(state: PreferencesState) {
  if (!state.scope) return;
  try {
    localStorage.setItem(CACHE_PREFIX + state.scope, JSON.stringify(pickPreferences(state)));
  } catch {
    // Armazenamento cheio ou bloqueado: as preferências continuam valendo nesta sessão.
  }
}

export const usePreferences = create<PreferencesState>()((set, get) => ({
  ...DEFAULT_PREFERENCES,
  scope: null,
  accountLoaded: false,
  syncStatus: 'local',
  syncError: null,

  set: (key, value) => {
    set({ [key]: value } as Partial<PreferencesState>);
    writeCache(get());
    sink?.(key, value);
  },

  reset: () => {
    const visual = { theme: DEFAULT_PREFERENCES.theme, motion: DEFAULT_PREFERENCES.motion, density: DEFAULT_PREFERENCES.density, effects: DEFAULT_PREFERENCES.effects };
    for (const [key, value] of Object.entries(visual)) get().set(key as keyof Preferences, value as never);
  },

  switchScope: (scope, loaded) => {
    if (get().scope === scope) return;
    set({ ...DEFAULT_PREFERENCES, ...(scope ? readCache(scope) : {}), scope, accountLoaded: loaded, syncStatus: loaded ? 'local' : 'loading', syncError: null });
  },

  apply: (values, status = 'ready') => {
    set({ ...values, accountLoaded: true, syncStatus: status, syncError: null });
    writeCache(get());
  },

  setSync: (status, error = null) => set({ syncStatus: status, syncError: error }),
}));

/** Remove do navegador o cache de preferências de todas as contas (usado ao excluir dados locais). */
export function clearPreferenceCaches() {
  for (const key of Object.keys(localStorage)) if (key.startsWith(CACHE_PREFIX) || key === LEGACY_KEY) localStorage.removeItem(key);
}
