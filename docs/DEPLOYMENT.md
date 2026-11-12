# Publicação do frontend na Vercel

## Configuração do projeto (uma vez)

| Campo | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite (também definido em `frontend/vercel.json`) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Variáveis de ambiente | Nenhuma para o modo demonstração (padrão). Para autenticação real, ver abaixo. |

`frontend/vercel.json` redireciona qualquer rota para `index.html`. Sem isso,
recarregar uma página interna (ex.: `/portfolios/123`) retorna 404 na Vercel.

> Variáveis `VITE_*` são embutidas no JavaScript no momento do build.
> Depois de alterá-las na Vercel, é preciso fazer um novo deploy.
> Nunca coloque segredos (chaves de IA, senhas) em variáveis `VITE_*`.

## Modo com autenticação real (Supabase)

Em **Settings → Environment Variables**, defina para Production (e Preview, se usar):

| Variável | Valor |
|---|---|
| `VITE_APP_MODE` | `supabase` |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave publicável (`sb_publishable_...`) |
| `BRAPI_API_KEY` | opcional, somente servidor (cotações além de PETR4, VALE3, MGLU3, ITUB4) |
| `PLUGGY_CLIENT_ID` | somente servidor (Open Finance) |
| `PLUGGY_CLIENT_SECRET` | somente servidor (Open Finance) |
| `SUPABASE_SECRET_KEY` | somente servidor; chave `sb_secret_...` usada para gravar dados importados |
| `VITE_PLUGGY_INCLUDE_SANDBOX` | `true` para exibir o conector de testes no widget |

Depois, faça um novo deploy. No Supabase, inclua a URL da Vercel em Site URL e Redirect URLs
(ver `docs/SUPABASE.md`, seção 3).

## Testar localmente antes de publicar

```bash
cd frontend
npm ci
npm run build          # deve terminar com "built in ..."
npm run preview        # abre em http://localhost:4173
npm run check:domain   # verificações dos cálculos de carteira
```

## Checklist depois do deploy

1. Abrir a URL pública, clicar em **Entrar no modo demonstração**.
2. Criar uma carteira, registrar uma compra, voltar ao dashboard.
3. Recarregar a página (F5) no dashboard e dentro da carteira: os dados devem continuar.
4. Abrir diretamente `https://SEU-PROJETO.vercel.app/portfolios` em outra aba: deve carregar (não 404).
5. Testar no celular: o menu abre pelo ícone no topo.
