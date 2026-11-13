# Publicação: GitHub e Vercel

## 1. Antes de publicar no GitHub

1. Confira que `frontend/.env.local` não está versionado: `git status` não deve listá-lo.
2. Rode a varredura em todo o histórico, na raiz do repositório:
   ```bash
   sh scripts/scan-secrets.sh
   ```
   Sem linhas "ENCONTRADO", nada foi detectado.
3. Se algo for encontrado, **considere a chave comprometida** mesmo que você apague o arquivo depois
   (o histórico guarda tudo):
   - Groq: console.groq.com → API Keys → revogue e crie outra.
   - Pluggy: dashboard.pluggy.ai → aplicação → gere um novo Client Secret.
   - Supabase: Project Settings → API Keys → revogue a secret key e crie outra.
   - brapi: brapi.dev/dashboard → gere novo token.
   Depois atualize as variáveis no `.env.local` e na Vercel. Reescrever o histórico (ex.: `git filter-repo`)
   só é necessário se o repositório já tiver sido publicado, e não substitui a revogação.
4. Publique:
   ```bash
   git remote add origin https://github.com/<usuario>/ai-wealth-advisor.git
   git push -u origin fase-7
   ```

## 2. Projeto na Vercel

1. vercel.com → Add New → Project → importe o repositório.
2. **Root Directory:** `frontend`. Framework: Vite (detectado). Build: `npm run build`. Output: `dist`.
3. `frontend/vercel.json` já define: rewrite do SPA para `index.html` (exceto `/api/`), duração das
   funções (60 s para IA e Pluggy), cache dos arquivos com hash e cabeçalhos de segurança.
4. Settings → Environment Variables (Production e Preview):

| Variável | Valor |
|---|---|
| `VITE_APP_MODE` | `supabase` |
| `VITE_SUPABASE_URL` | URL do projeto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` | da aplicação Pluggy |
| `VITE_PLUGGY_INCLUDE_SANDBOX` | `true` para a apresentação com Sandbox |
| `VITE_OPEN_FINANCE_ENV` | `sandbox` enquanto a Pluggy não liberar produção; depois `production` |
| `AI_PROVIDER` | `groq` |
| `GROQ_API_KEY` | chave da Groq |
| `GROQ_MODEL` | opcional; padrão `openai/gpt-oss-120b` |
| `BRAPI_API_KEY` | recomendado na Vercel (sem chave, o limite é por IP, e o IP das funções é compartilhado) |

   Cole os valores sem aspas. Espaços e quebras de linha no fim são removidos pelo servidor desde a
   Fase 9, mas o valor em si precisa estar correto.

   Variáveis `VITE_` são incorporadas no build: depois de alterá-las, faça um novo deploy.
5. Deploy.

Para uma versão pública apenas demonstrativa, crie um segundo projeto (ou ambiente) com
`VITE_APP_MODE=demo` e nenhuma outra variável: ele não depende de serviços privados.

## 3. Supabase

**Banco:** no SQL Editor, aplique as migrations de `supabase/migrations/` que ainda não rodou, em ordem
de nome. A Fase 9 depende da Fase 8.1: `20261116090000_user_settings.sql` antes de
`20261117090000_account_sync.sql`. A migration da Fase 9 também cria o bucket privado `avatars` e as
políticas do Storage. Depois rode os testes de `supabase/tests/`.

**Auth** → URL Configuration:
- **Site URL:** `https://<seu-projeto>.vercel.app`
- **Redirect URLs:** `https://<seu-projeto>.vercel.app/**` e `http://localhost:5173/**`. Para deploys de
  Preview, inclua também `https://*-<sua-conta>.vercel.app/**`.

Sem isso, o link de confirmação de e-mail volta para o localhost. O cadastro usa `/login` como retorno,
coberto pelo `/**`.

## 4. Pluggy

O widget roda no domínio publicado sem configuração extra no Sandbox. Se o painel da Pluggy pedir
domínios permitidos ou URL de retorno para OAuth, cadastre `https://<seu-projeto>.vercel.app`.

## 5. Verificação depois do deploy (a fazer na URL publicada)

1. Abra uma rota interna diretamente (ex.: `/financas`) e recarregue: deve abrir a página, não 404.
2. Cadastro → e-mail de confirmação → link volta para o domínio da Vercel.
3. Carteira com ITUB4: cotação aparece (função `/api/quotes`).
4. Integrações → Conectar banco → Pluggy Bank (`user-ok` / `password-ok`).
5. Chat: a resposta deve aparecer em partes. Se chegar inteira de uma vez, verifique em
   Vercel → Logs se a função `api/ai/chat` respondeu com `text/event-stream`.
6. Duas contas diferentes: nenhuma vê dados, preferências ou foto da outra.
7. Mesma conta no PC e no celular: IA ativada, guias vistos e foto aparecem nos dois (checklist completo
   em `docs/FASE9.md`, seção 8).
8. Vercel → Logs: nenhuma linha com chave, token ou dado financeiro (as funções não registram esses dados).

## 6. Diagnóstico de problemas na Vercel

- **Função que não carrega:** Vercel → Logs, filtre pela rota (`/api/ai/chat`, `/api/pluggy/...`,
  `/api/quotes`). `ERR_MODULE_NOT_FOUND` indica import sem extensão no código de servidor;
  `npm run check:functions` reproduz esse runtime localmente e falha antes do deploy.
- **Configuração:** `GET /api/health?probe=1` com o token da sessão (procedimento em `docs/FASE9.md`,
  seção 1). Mostra quais variáveis existem e testa Groq, Pluggy e a chave secreta do Supabase, sem
  revelar valores.
- **Mensagens no app:** a IA diferencia chave recusada, modelo indisponível, limite do provedor,
  instabilidade, tempo esgotado e sessão expirada. "O servidor não conseguiu executar esta função"
  significa que a Vercel nem iniciou a função: veja os Logs.

O deploy só deve ser considerado aprovado depois desses passos na URL publicada.
