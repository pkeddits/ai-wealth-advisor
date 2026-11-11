# Supabase: banco de dados e autenticação

## 1. Aplicar o schema

No painel do projeto, abra **SQL Editor** e execute, nesta ordem, o conteúdo de:

1. `supabase/migrations/20261111120000_core_schema.sql`
2. `supabase/migrations/20261111120100_seed_assets.sql`

Com a Supabase CLI: `supabase link --project-ref <ref>` e `supabase db push`.

Tabelas criadas: `profiles`, `portfolios`, `assets`, `transactions`, todas com RLS.
O perfil é criado automaticamente quando um usuário se cadastra.

## 2. Verificar o isolamento entre usuários

Execute `supabase/tests/rls_isolation.sql` no SQL Editor. O script cria dois usuários de teste,
verifica 13 regras e desfaz tudo ao final (`rollback`), sem deixar dados.

- Sucesso: a última consulta retorna `todos os testes passaram`.
- Falha: a execução para com uma mensagem iniciada por `FALHA`.

Execute novamente sempre que alterar políticas ou migrations.

## 3. Configurar o Auth

Em **Authentication**:

- Provedor **Email** habilitado.
- **Confirm email**: ligado exige confirmação por e-mail antes do primeiro login (a tela de
  cadastro informa isso ao usuário). O SMTP padrão do Supabase tem limite baixo de envios por
  hora; para demonstrações com vários cadastros, desligue a confirmação ou configure um SMTP próprio.
- **URL Configuration**:
  - Site URL: `https://SEU-PROJETO.vercel.app`
  - Redirect URLs: `https://SEU-PROJETO.vercel.app/login`, `http://localhost:5173/login`,
    `http://localhost:4173/login`

## 4. Chaves

Em **Project Settings → API Keys**, copie a URL do projeto e a **publishable key**
(`sb_publishable_...`; a anon key legada também funciona). A secret key e a service_role key
nunca vão para o frontend nem para variáveis `VITE_*`; a aplicação recusa iniciar se detectar uma delas.

## 5. Executar localmente

`frontend/.env.local`:

```
VITE_APP_MODE=supabase
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

```bash
cd frontend
npm ci
npm run dev
```

## 6. Teste manual com duas contas

1. Cadastre a conta A (perfil Arrojado) e a conta B (perfil Conservador), em navegadores ou
   janelas anônimas diferentes.
2. Em cada uma, o painel deve mostrar o nome e o perfil da própria conta.
3. Em **Table Editor → profiles**, confirme que existem as duas linhas com os dados informados.
4. Saia e entre novamente; recarregue a página com a sessão ativa: o painel deve continuar aberto.
5. Tente entrar com senha errada: a mensagem deve ser "E-mail ou senha incorretos."

O isolamento de carteiras e transações entre A e B é verificado pelo passo 2, porque a interface
de carteiras ainda não usa o banco.

## Testes do SQL sem Supabase

Para validar migrations em um PostgreSQL comum, aplique antes
`supabase/tests/support/supabase_auth_stub.sql` (reproduz `auth.users`, `auth.uid()` e os papéis
do Supabase). Esse arquivo não deve ser aplicado em um projeto Supabase.

```bash
createdb aiwa_test
psql -d aiwa_test -f supabase/tests/support/supabase_auth_stub.sql
psql -d aiwa_test -f supabase/migrations/20261111120000_core_schema.sql
psql -d aiwa_test -f supabase/migrations/20261111120100_seed_assets.sql
psql -d aiwa_test -v ON_ERROR_STOP=1 -f supabase/tests/rls_isolation.sql
```
