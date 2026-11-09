# Publicação do frontend na Vercel

## Configuração do projeto (uma vez)

| Campo | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite (também definido em `frontend/vercel.json`) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Variável de ambiente | `VITE_DEMO_MODE` = `true` (opcional: já é o padrão) |

`frontend/vercel.json` redireciona qualquer rota para `index.html`. Sem isso,
recarregar uma página interna (ex.: `/portfolios/123`) retorna 404 na Vercel.

> Variáveis `VITE_*` são embutidas no JavaScript no momento do build.
> Depois de alterá-las na Vercel, é preciso fazer um novo deploy.
> Nunca coloque segredos (chaves de IA, senhas) em variáveis `VITE_*`.

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
