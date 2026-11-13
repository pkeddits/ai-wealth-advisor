/**
 * Sincronização de conta entre dispositivos. Cada "dispositivo" é uma cópia independente do módulo
 * (estado, localStorage e sessão próprios); todos falam com o mesmo backend simulado, que aplica as
 * regras da migration 20261117090000: linha por usuário, RPCs dos guias e Storage restrito à pasta do dono.
 */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FALHA  ${name}${detail ? ` (${detail})` : ''}`);
  }
};

const backend = { rows: new Map(), objects: new Map(), failNext: 0 };
const ANA = '00000000-0000-4000-8000-0000000000aa';
const BRUNO = '00000000-0000-4000-8000-0000000000bb';
const TUTORIAL = /^[a-z]{2,32}$/;

function row(uid) {
  if (!backend.rows.has(uid)) backend.rows.set(uid, { user_id: uid, preferences: {}, tutorials_seen: [], tutorials_replay: [], tutorials_on_next_login: false, avatar_path: null });
  return backend.rows.get(uid);
}

/** Cliente Supabase mínimo: cada dispositivo tem sua sessão; o banco só expõe a linha do usuário da sessão. */
globalThis.__fakeSupabase = (device) => ({
  from(table) {
    if (table !== 'user_settings') throw new Error(`tabela inesperada ${table}`);
    return {
      select(cols) {
        return {
          maybeSingle: async () => {
            if (backend.failNext > 0) {
              backend.failNext--;
              return { data: null, error: { message: 'offline' } };
            }
            const r = backend.rows.get(device.uid);
            if (!r) return { data: null, error: null };
            return { data: Object.fromEntries(cols.split(',').map((c) => c.trim()).map((c) => [c, structuredClone(r[c])])), error: null };
          },
        };
      },
      async upsert(values) {
        if (backend.failNext > 0) {
          backend.failNext--;
          return { error: { message: 'offline' } };
        }
        if ('user_id' in values) return { error: { message: 'permission denied' } };
        if (values.avatar_path && values.avatar_path.split('/')[0] !== device.uid) return { error: { message: 'check violation' } };
        Object.assign(row(device.uid), structuredClone(values));
        return { error: null };
      },
    };
  },
  async rpc(name, args) {
    const r = row(device.uid);
    if (name === 'mark_tutorial_seen') {
      if (!TUTORIAL.test(args.p_id)) return { error: { message: 'invalid' } };
      if (!r.tutorials_seen.includes(args.p_id)) r.tutorials_seen.push(args.p_id);
      r.tutorials_replay = r.tutorials_replay.filter((id) => id !== args.p_id);
      return { data: null, error: null };
    }
    if (name === 'reset_tutorials') {
      r.tutorials_seen = [];
      r.tutorials_replay = [];
      return { data: null, error: null };
    }
    if (name === 'consume_tutorials_on_next_login') {
      if (!r.tutorials_on_next_login) return { data: false, error: null };
      r.tutorials_on_next_login = false;
      r.tutorials_replay = [...args.p_ids];
      return { data: true, error: null };
    }
    return { error: { message: 'rpc desconhecida' } };
  },
  storage: {
    from() {
      const owns = (p) => p.split('/')[0] === device.uid;
      return {
        async upload(p, blob, opts) {
          if (!owns(p)) return { error: { message: 'new row violates row-level security policy' } };
          if (backend.objects.has(p) && !opts.upsert) return { error: { message: 'exists' } };
          backend.objects.set(p, { type: blob.type, size: blob.size });
          return { data: { path: p }, error: null };
        },
        async remove(paths) {
          for (const p of paths) if (owns(p)) backend.objects.delete(p);
          return { error: null };
        },
        async createSignedUrl(p) {
          if (!owns(p) || !backend.objects.has(p)) return { data: null, error: { message: 'not found' } };
          return { data: { signedUrl: `https://storage.test/${p}?token=signed` }, error: null };
        },
      };
    },
  },
});

class MemoryStorage {
  #m = new Map();
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null; }
  setItem(k, v) { this.#m.set(k, String(v)); }
  removeItem(k) { this.#m.delete(k); }
  key(i) { return [...this.#m.keys()][i] ?? null; }
  get length() { return this.#m.size; }
  keys() { return [...this.#m.keys()]; }
}

const listeners = new Map();
globalThis.window = { addEventListener: (t, f) => listeners.set(t, f), removeEventListener: () => {} };
globalThis.document = {
  visibilityState: 'visible',
  addEventListener: () => {},
  removeEventListener: () => {},
  createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob: (cb, type) => cb(new Blob(['img'], { type })) }),
};
globalThis.Image = class {
  naturalWidth = 800;
  naturalHeight = 600;
  set src(_) { queueMicrotask(() => this.onload()); }
};
URL.createObjectURL = () => 'blob:x';
URL.revokeObjectURL = () => {};

const out = await mkdtemp(path.join(tmpdir(), 'aiwa-sync-'));
const fakeLib = {
  name: 'fake-supabase',
  setup(b) {
    b.onResolve({ filter: /lib\/supabase$/ }, () => ({ path: 'fake', namespace: 'fake' }));
    b.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({ contents: 'export const getSupabase = () => globalThis.__device.client;', loader: 'js' }));
  },
};

async function device(name) {
  const file = path.join(out, `${name}.mjs`);
  await build({
    stdin: {
      contents: "export { accountSync, avatarUrl } from './src/services/accountSync.ts'; export { usePreferences } from './src/store/preferencesStore.ts';",
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    outfile: file,
    define: { 'import.meta.env.VITE_APP_MODE': '"supabase"' },
    plugins: [fakeLib],
    logLevel: 'error',
  });
  const mod = await import(pathToFileURL(file).href);
  const state = { uid: null, storage: new MemoryStorage() };
  state.client = globalThis.__fakeSupabase(state);
  const use = () => {
    globalThis.__device = state;
    globalThis.localStorage = state.storage;
  };
  return {
    ...mod,
    async login(uid) {
      use();
      state.uid = uid;
      await mod.accountSync.start(uid);
    },
    async logout() {
      use();
      await mod.accountSync.flush();
      state.uid = null;
      await mod.accountSync.start(null);
    },
    async run(fn) {
      use();
      return fn(mod);
    },
    get prefs() {
      return mod.usePreferences.getState();
    },
    state,
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pc = await device('pc');
const phone = await device('celular');

// A: preferências (Problema A)
await pc.login(ANA);
check('PC: carrega conta sem linha com os padrões', pc.prefs.accountLoaded && pc.prefs.aiEnabled === false);
await pc.run(({ usePreferences }) => {
  usePreferences.getState().set('aiEnabled', true);
  usePreferences.getState().set('aiShareData', true);
  usePreferences.getState().set('theme', 'light');
});
await pc.run(({ accountSync }) => accountSync.flush());
await wait(600);
await pc.run(({ accountSync }) => accountSync.flush());
check('PC → banco: IA, consentimento e tema gravados', backend.rows.get(ANA)?.preferences.aiEnabled === true && backend.rows.get(ANA).preferences.aiShareData === true && backend.rows.get(ANA).preferences.theme === 'light', JSON.stringify(backend.rows.get(ANA)?.preferences));
check('PC: estado "sincronizado"', pc.prefs.syncStatus === 'ready', pc.prefs.syncStatus);

await phone.login(ANA);
check('Celular: IA ativada vem da conta', phone.prefs.aiEnabled === true);
check('Celular: consentimento vem da conta', phone.prefs.aiShareData === true);
check('Celular: tema vem da conta', phone.prefs.theme === 'light');

await phone.run(async ({ usePreferences, accountSync }) => {
  usePreferences.getState().set('dashboardView', 'financas');
  await wait(600);
  await accountSync.flush();
});
await pc.run(async ({ usePreferences, accountSync }) => {
  usePreferences.getState().set('density', 'compact');
  await wait(600);
  await accountSync.flush();
});
check('Mesclagem: alteração do PC não apaga a do celular', backend.rows.get(ANA).preferences.dashboardView === 'financas' && backend.rows.get(ANA).preferences.density === 'compact', JSON.stringify(backend.rows.get(ANA).preferences));
await pc.run(({ accountSync }) => accountSync.refresh());
check('B altera e A carrega depois (ao voltar para a aba)', pc.prefs.dashboardView === 'financas');

// B: tutoriais (Problema B)
await pc.run(({ accountSync }) => accountSync.markTutorialSeen('dashboard'));
await pc.run(({ accountSync }) => accountSync.markTutorialSeen('carteiras'));
await phone.run(({ accountSync }) => accountSync.refresh());
check('Guia concluído no PC aparece como visto no celular', ['dashboard', 'carteiras'].every((id) => phone.prefs.tutorialsSeen.includes(id)), phone.prefs.tutorialsSeen.join());

const fresh = await device('celular-novo');
await fresh.login(ANA);
check('Aparelho novo: histórico dos guias já carregado antes de abrir qualquer guia', fresh.prefs.accountLoaded && fresh.prefs.tutorialsSeen.includes('dashboard'));

backend.rows.get(ANA).tutorials_on_next_login = true;
await phone.run(async ({ accountSync }) => {
  check('Restaurar sessão (F5) não consome a reapresentação', backend.rows.get(ANA).tutorials_on_next_login === true);
  const applied = await accountSync.consumeReplay(['dashboard', 'carteiras', 'financas']);
  check('Login explícito consome a reapresentação', applied === true && backend.rows.get(ANA).tutorials_on_next_login === false);
  check('Segundo login não reaplica', (await accountSync.consumeReplay(['dashboard'])) === false);
});
await pc.run(({ accountSync }) => accountSync.refresh());
check('Guias pendentes valem nos dois dispositivos', pc.prefs.tutorialsReplay.join() === 'dashboard,carteiras,financas', pc.prefs.tutorialsReplay.join());
await pc.run(({ accountSync }) => accountSync.markTutorialSeen('financas'));
await phone.run(({ accountSync }) => accountSync.refresh());
check('Guia reapresentado e visto no PC sai do pendente no celular', !phone.prefs.tutorialsReplay.includes('financas'));
await phone.run(({ accountSync }) => accountSync.resetTutorials());
await pc.run(({ accountSync }) => accountSync.refresh());
check('Recomeçar todos no celular vale no PC', pc.prefs.tutorialsSeen.length === 0);

// C: foto de perfil (Problema C)
await phone.run(({ accountSync }) => accountSync.uploadAvatar(new File(['x'], 'foto.png', { type: 'image/png' })));
const firstPath = backend.rows.get(ANA).avatar_path;
check('Celular: foto enviada para a pasta da conta', typeof firstPath === 'string' && firstPath.startsWith(`${ANA}/avatar-`) && backend.objects.has(firstPath), firstPath);
check('Foto reduzida e enviada como imagem', ['image/webp', 'image/jpeg'].includes(backend.objects.get(firstPath)?.type));
check('Foto não fica em data URL no navegador', !phone.state.storage.keys().some((k) => (phone.state.storage.getItem(k) ?? '').includes('data:image')));
await pc.run(({ accountSync }) => accountSync.refresh());
check('PC: mostra a foto trocada no celular', pc.prefs.avatar.kind === 'photo' && pc.prefs.avatar.path === firstPath);
const url = await pc.run(({ avatarUrl }) => avatarUrl(firstPath));
check('PC: URL assinada da foto', url?.includes(firstPath));
await wait(5);
await pc.run(({ accountSync }) => accountSync.uploadAvatar(new File(['y'], 'nova.jpg', { type: 'image/jpeg' })));
const secondPath = backend.rows.get(ANA).avatar_path;
check('Troca: caminho novo (sem cache antigo) e foto anterior removida', secondPath !== firstPath && !backend.objects.has(firstPath) && backend.objects.has(secondPath));
await phone.run(({ accountSync }) => accountSync.refresh());
check('Celular: recebe a foto trocada no PC', phone.prefs.avatar.kind === 'photo' && phone.prefs.avatar.path === secondPath);
await phone.run(async ({ accountSync }) => {
  let error = '';
  try { await accountSync.uploadAvatar(new File(['x'], 'doc.pdf', { type: 'application/pdf' })); } catch (e) { error = e.message; }
  check('Formato inválido recusado', error.includes('Formato'));
  try { await accountSync.uploadAvatar({ size: 20 * 1024 * 1024, type: 'image/png' }); error = ''; } catch (e) { error = e.message; }
  check('Arquivo grande demais recusado', error.includes('8 MB'));
});

// Duas contas no mesmo navegador
await pc.logout();
check('Logout: preferências privadas saem da memória', pc.prefs.aiEnabled === false && pc.prefs.scope === null && pc.prefs.avatar.kind === 'gradient');
check('Logout: preferências da conta continuam no banco', backend.rows.get(ANA).preferences.aiEnabled === true);
await pc.login(BRUNO);
check('Outra conta no mesmo navegador não herda IA, tema, guias ou foto', pc.prefs.aiEnabled === false && pc.prefs.theme === 'dark' && pc.prefs.tutorialsSeen.length === 0 && pc.prefs.avatar.kind === 'gradient');
const stolen = await pc.run(({ avatarUrl }) => avatarUrl(secondPath));
check('Bruno não obtém a URL da foto da Ana', stolen === null);
await pc.run(async ({ accountSync }) => {
  let error = '';
  pc.state.uid = BRUNO;
  try {
    await globalThis.__device.client.from('user_settings').upsert({ avatar_path: secondPath });
  } catch (e) { error = e.message; }
  const r = await globalThis.__device.client.from('user_settings').upsert({ avatar_path: secondPath });
  check('Bruno não aponta o próprio avatar para a foto da Ana', Boolean(r.error));
});
await pc.logout();
await pc.login(ANA);
check('Ana volta ao mesmo navegador e recupera as próprias preferências', pc.prefs.aiEnabled === true && pc.prefs.avatar.kind === 'photo');

// Falha de rede
backend.failNext = 3;
await pc.run(async ({ usePreferences, accountSync }) => {
  usePreferences.getState().set('hideValues', true);
  await wait(600);
  await accountSync.flush();
});
check('Falha ao salvar fica visível', pc.prefs.syncStatus === 'error' && Boolean(pc.prefs.syncError));
check('Falha não desfaz a alteração local', pc.prefs.hideValues === true);
await pc.run(({ accountSync }) => accountSync.refresh());
check('Aviso de falha continua após recarregar do banco', pc.prefs.syncStatus === 'error' && pc.prefs.hideValues === true, pc.prefs.syncStatus);
await pc.run(({ accountSync }) => accountSync.retry());
check('Nova tentativa envia a alteração pendente', backend.rows.get(ANA).preferences.hideValues === true && pc.prefs.syncStatus === 'ready', pc.prefs.syncStatus);

backend.rows.get(ANA).preferences.theme = 'roxo-inexistente';
backend.rows.get(ANA).preferences.aiEnabled = 'sim';
await pc.run(({ accountSync }) => accountSync.refresh());
check('Valores inválidos vindos do banco são ignorados', pc.prefs.theme === 'dark' && pc.prefs.aiEnabled === false);

await rm(out, { recursive: true, force: true });
console.log(`${passed} verificações OK, ${failed} falhas`);
process.exit(failed ? 1 : 0);
