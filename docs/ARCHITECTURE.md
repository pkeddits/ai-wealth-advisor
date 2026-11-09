# Arquitetura atual do frontend

## Estado do projeto (novembro/2026)

- **Funciona (modo demonstração):** entrada demo, carteiras, compras e vendas,
  posições por custo médio, dashboard, gráfico de alocação, persistência no navegador.
- **Em desenvolvimento:** autenticação real, banco de dados, IA, analytics,
  simulações, alertas, configurações.
- **Backend Go (`backend/`):** não compila. Mantido no repositório como referência
  (modelos, fórmulas e prompts). Ver diagnóstico na conversa de auditoria.

## Modo demonstração × API

`src/config/appMode.ts` define `isDemoMode` (padrão `true`; `VITE_DEMO_MODE=false` desativa).

```
páginas / stores
      │  importam SEMPRE de 'src/services'
      ▼
src/services/index.ts  ──► isDemoMode ? services/demo/* : services/*.ts (Axios)
                                │
                                ▼
                     src/domain/positions.ts  (cálculos puros, sem I/O)
```

Regras para quem for alterar (pessoas ou IAs):

1. **Páginas não importam** `services/auth.ts`, `services/demo/...` etc. diretamente:
   use `from '../services'`. (Exceções atuais: `loadDemoSample` e `demoPriceOf`,
   usados só quando `isDemoMode`.)
2. Um service novo (ex.: Supabase) deve ter **o mesmo formato** do service da API,
   verificado com `typeof` como em `services/demo/portfolio.ts`.
3. Cálculos financeiros ficam em `src/domain/` como funções puras com verificação
   em `scripts/` (`npm run check:domain`). A IA só **interpreta** resultados já calculados.
4. Recurso que não existe no modo demo lança `DemoUnavailableError`; a interface
   mostra "Em desenvolvimento" em vez de botões que não funcionam.

## Dados do modo demonstração

- Chave `aiwa.demo.v1` no `localStorage` (carteiras e transações).
- Ativos e preços em `services/demo/catalog.ts`: **preços fictícios fixos**.
- Posições não são gravadas; são recalculadas a partir das transações.
