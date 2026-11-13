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
3. `frontend/vercel.json` já define: rewrite do SPA para `index.html` (exceto `/api/`) e 60 s de
   duração para as funções de IA e Pluggy.
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
| `BRAPI_API_KEY` | opcional |

   Variáveis `VITE_` são incorporadas no build: depois de alterá-las, faça um novo deploy.
5. Deploy.

Para uma versão pública apenas demonstrativa, crie um segundo projeto (ou ambiente) com
`VITE_APP_MODE=demo` e nenhuma outra variável: ele não depende de serviços privados.

## 3. Supabase Auth

Authentication → URL Configuration:
- **Site URL:** `https://<seu-projeto>.vercel.app`
- **Redirect URLs:** `https://<seu-projeto>.vercel.app/**` e `http://localhost:5173/**`

Sem isso, o link de confirmação de e-mail volta para o localhost.

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
6. Duas contas diferentes: nenhuma vê dados da outra.
7. Vercel → Logs: nenhuma linha com chave, token ou dado financeiro (as funções não registram esses dados).

O deploy só deve ser considerado aprovado depois desses passos na URL publicada.
