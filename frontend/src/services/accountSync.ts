import { appMode } from '../config/appMode';
import { getSupabase } from '../lib/supabase';
import {
  DEFAULT_PREFERENCES,
  SYNCED_KEYS,
  sanitizePreferences,
  setPreferencesSink,
  usePreferences,
  type AvatarPreference,
  type Preferences,
  type SyncedKey,
} from '../store/preferencesStore';

/**
 * Preferências da conta no Supabase (user_settings), fonte de verdade entre dispositivos.
 * O cache local por usuário só acelera a primeira pintura; o valor do banco sempre prevalece.
 */

const COLUMNS = 'preferences, tutorials_seen, tutorials_replay, avatar_path, updated_at';
const PUSH_DELAY = 500;
const PULL_THROTTLE = 10_000;
const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 256;
const AVATAR_MAX_INPUT = 8 * 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

interface SettingsRow {
  preferences: Record<string, unknown> | null;
  tutorials_seen: string[] | null;
  tutorials_replay: string[] | null;
  avatar_path: string | null;
}

let userId: string | null = null;
let dirty = new Map<SyncedKey | 'avatarGradient', unknown>();
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing: Promise<void> | null = null;
let lastPull = 0;
let generation = 0;

const syncedSet = new Set<string>(SYNCED_KEYS);
const remote = () => appMode === 'supabase' && userId !== null;

function fromRow(row: SettingsRow | null): Partial<Preferences> {
  const prefs = sanitizePreferences(row?.preferences ?? {});
  const avatar: AvatarPreference = row?.avatar_path
    ? { kind: 'photo', path: row.avatar_path }
    : prefs.avatar ?? DEFAULT_PREFERENCES.avatar;
  const values: Partial<Preferences> = { ...DEFAULT_PREFERENCES, ...prefs, avatar, tutorialsSeen: row?.tutorials_seen ?? [], tutorialsReplay: row?.tutorials_replay ?? [] };
  // Alterações ainda não enviadas continuam valendo localmente até a gravação terminar.
  for (const [key, value] of dirty) if (key !== 'avatarGradient') (values as Record<string, unknown>)[key] = value;
  return values;
}

function message(error: unknown, fallback: string) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'Sem conexão. As alterações serão enviadas quando a internet voltar.';
  return error instanceof Error && error.message ? error.message : fallback;
}

async function pull(force = false) {
  if (!remote()) return;
  if (!force && Date.now() - lastPull < PULL_THROTTLE) return;
  lastPull = Date.now();
  const gen = generation;
  // Alterações pendentes (inclusive as que falharam) sobem antes de ler o banco.
  if (dirty.size || pushing) await flush();
  if (gen !== generation) return;
  const { data, error } = await getSupabase().from('user_settings').select(COLUMNS).maybeSingle<SettingsRow>();
  if (gen !== generation) return;
  if (error) {
    usePreferences.getState().setSync('error', 'Não foi possível carregar as preferências da conta.');
    return;
  }
  const { syncStatus, syncError } = usePreferences.getState();
  usePreferences.getState().apply(fromRow(data), dirty.size ? 'saving' : 'ready');
  // Se o envio falhou, o aviso continua até uma gravação dar certo.
  if (dirty.size && syncStatus === 'error') usePreferences.getState().setSync('error', syncError);
}

async function push() {
  if (!remote() || !dirty.size) return;
  const gen = generation;
  const batch = dirty;
  dirty = new Map();
  usePreferences.getState().setSync('saving');
  try {
    const supabase = getSupabase();
    // Mescla sobre o que está no banco: outro dispositivo pode ter alterado outras chaves.
    const { data, error: readError } = await supabase.from('user_settings').select('preferences').maybeSingle<{ preferences: Record<string, unknown> | null }>();
    if (readError) throw new Error('Não foi possível salvar as preferências.');
    const merged = { ...(data?.preferences ?? {}), ...Object.fromEntries(batch) };
    const { error } = await supabase.from('user_settings').upsert({ preferences: merged }, { onConflict: 'user_id' });
    if (error) throw new Error('Não foi possível salvar as preferências.');
    if (gen === generation) usePreferences.getState().setSync(dirty.size ? 'saving' : 'ready');
  } catch (error) {
    if (gen !== generation) return;
    for (const [key, value] of batch) if (!dirty.has(key)) dirty.set(key, value);
    usePreferences.getState().setSync('error', message(error, 'Não foi possível salvar as preferências.'));
  }
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushing = push().finally(() => {
      pushing = null;
    });
  }, PUSH_DELAY);
}

async function flush() {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  if (pushing) await pushing;
  if (dirty.size) {
    pushing = push().finally(() => {
      pushing = null;
    });
    await pushing;
  }
}

setPreferencesSink((key, value) => {
  if (!remote()) return;
  if (syncedSet.has(key)) {
    dirty.set(key as SyncedKey, value);
    schedulePush();
  } else if (key === 'avatar' && (value as AvatarPreference).kind === 'gradient') {
    dirty.set('avatarGradient', (value as { index: number }).index);
    schedulePush();
  }
});

function onVisible() {
  if (document.visibilityState === 'visible') void pull();
}
function onOnline() {
  void flush().then(() => pull(true));
}

let listening = false;
function listen(on: boolean) {
  if (on === listening || typeof window === 'undefined') return;
  listening = on;
  const method = on ? 'addEventListener' : 'removeEventListener';
  document[method]('visibilitychange', onVisible);
  window[method]('focus', onVisible);
  window[method]('online', onOnline);
}

export const accountSync = {
  /** Chamado sempre que o usuário autenticado muda (login, restauração de sessão, logout, troca de conta). */
  async start(nextUserId: string | null) {
    if (nextUserId === userId && usePreferences.getState().scope !== null) return;
    if (userId && nextUserId !== userId) await flush().catch(() => undefined);
    generation++;
    dirty = new Map();
    userId = nextUserId;
    lastPull = 0;
    const store = usePreferences.getState();
    if (!nextUserId) {
      listen(false);
      store.switchScope(null, false);
      return;
    }
    if (appMode !== 'supabase') {
      store.switchScope(appMode === 'demo' ? 'demo' : 'device', true);
      return;
    }
    store.switchScope(`user:${nextUserId}`, false);
    listen(true);
    await pull(true);
  },

  refresh: () => pull(true),
  flush,

  async retry() {
    await flush();
    await pull(true);
  },

  async markTutorialSeen(id: string) {
    const store = usePreferences.getState();
    if (!store.tutorialsSeen.includes(id) || store.tutorialsReplay.includes(id)) {
      store.apply({ tutorialsSeen: store.tutorialsSeen.includes(id) ? store.tutorialsSeen : [...store.tutorialsSeen, id], tutorialsReplay: store.tutorialsReplay.filter((t) => t !== id) }, store.syncStatus === 'local' ? 'local' : 'ready');
    }
    if (!remote()) return;
    const { error } = await getSupabase().rpc('mark_tutorial_seen', { p_id: id });
    if (error) usePreferences.getState().setSync('error', 'Não foi possível registrar o guia como visto.');
  },

  async resetTutorials() {
    const store = usePreferences.getState();
    store.apply({ tutorialsSeen: [], tutorialsReplay: [] }, store.syncStatus === 'local' ? 'local' : 'ready');
    if (!remote()) return;
    const { error } = await getSupabase().rpc('reset_tutorials');
    if (error) throw new Error('Não foi possível recomeçar os guias.');
  },

  /** Aplica "Mostrar tutoriais no próximo login". Só é chamado em um login explícito, nunca ao restaurar a sessão. */
  async consumeReplay(ids: string[]): Promise<boolean> {
    if (appMode !== 'supabase') return false;
    const { data, error } = await getSupabase().rpc('consume_tutorials_on_next_login', { p_ids: ids });
    if (error || data !== true) return false;
    return true;
  },

  /** Reduz, envia ao Storage na pasta do usuário e só então aponta a conta para a nova foto. */
  async uploadAvatar(file: File): Promise<void> {
    if (file.size > AVATAR_MAX_INPUT) throw new Error('Use uma imagem de até 8 MB.');
    if (file.type && !AVATAR_TYPES.includes(file.type)) throw new Error('Formato não suportado. Use JPG, PNG ou WebP.');
    const blob = await resizeImage(file);
    const store = usePreferences.getState();
    if (!remote()) {
      store.set('avatar', { kind: 'image', dataUrl: await blobToDataUrl(blob) });
      return;
    }
    const previous = store.avatar.kind === 'photo' ? store.avatar.path : null;
    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/avatar-${Date.now()}.${extension}`;
    const supabase = getSupabase();
    const upload = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
    if (upload.error) throw new Error(upload.error.message?.includes('Bucket not found') ? 'O armazenamento de fotos ainda não foi configurado (migration da Fase 9).' : 'Não foi possível enviar a foto.');
    const { error } = await supabase.from('user_settings').upsert({ avatar_path: path, avatar_updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) {
      await supabase.storage.from(AVATAR_BUCKET).remove([path]);
      throw new Error('Não foi possível salvar a foto na conta.');
    }
    store.apply({ avatar: { kind: 'photo', path } }, 'ready');
    if (previous && previous !== path) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  },

  async removeAvatar(): Promise<void> {
    const store = usePreferences.getState();
    const previous = store.avatar.kind === 'photo' ? store.avatar.path : null;
    const gradient = { kind: 'gradient', index: 0 } as const;
    if (!remote()) {
      store.set('avatar', gradient);
      return;
    }
    const supabase = getSupabase();
    const { error } = await supabase.from('user_settings').upsert({ avatar_path: null, avatar_updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw new Error('Não foi possível remover a foto.');
    store.set('avatar', gradient);
    if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  },
};

const signed = new Map<string, { url: string; expiresAt: number }>();

/** URL temporária da foto (bucket privado). Cada troca gera um caminho novo, então não há cache antigo. */
export async function avatarUrl(path: string): Promise<string | null> {
  const hit = signed.get(path);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.url;
  const { data, error } = await getSupabase().storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  signed.set(path, { url: data.signedUrl, expiresAt: Date.now() + 3600_000 });
  return data.signedUrl;
}

export function clearAvatarUrls() {
  signed.clear();
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem. Use JPG, PNG ou WebP.'));
    };
    img.src = url;
  });
}

/** Recorta ao centro em 256 px. WebP quando o navegador suporta; JPEG nos demais (Safari antigo). */
async function resizeImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  const scale = Math.max(AVATAR_SIZE / img.naturalWidth, AVATAR_SIZE / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (AVATAR_SIZE - w) / 2, (AVATAR_SIZE - h) / 2, w, h);
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86));
  const webp = await toBlob('image/webp');
  const blob = webp?.type === 'image/webp' ? webp : await toBlob('image/jpeg');
  if (!blob) throw new Error('Não foi possível processar a imagem.');
  return blob;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(blob);
  });
}
