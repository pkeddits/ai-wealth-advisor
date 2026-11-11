# Arquitetura do frontend

## Modos de execução

`VITE_APP_MODE` define a origem dos dados (`src/config/appMode.ts`):

| Modo | Autenticação | Carteiras e transações | Uso |
|---|---|---|---|
| `demo` (padrão) | local, sem conta | `localStorage`, preços fictícios | apresentação sem servidor |
| `supabase` | Supabase Auth | ainda não migradas: "Em desenvolvimento" | versão real em construção |
| `api` | JWT do backend Go | backend Go | referência; o backend não compila |

O modo é constante de build: o Vite remove do bundle o código dos outros modos
(o build demo não inclui o `supabase-js`).

## Camadas

```
páginas e stores
   │
   ├─ useAuthStore ──► services/session ──► demo | supabase | api
   │
   └─ services/index.ts ──► services/demo/* | services/*.ts (API Go) | unavailableService
                                   │
                                   └─► domain/positions.ts (cálculos puros)
```

- Páginas importam services sempre de `src/services`, nunca de uma implementação.
- Um service novo (ex.: carteiras no Supabase) deve ter o mesmo formato do service da API,
  verificado com `typeof`, como em `services/demo/portfolio.ts`.
- No modo `supabase`, módulos não migrados usam `unavailableService`, que falha com mensagem
  explícita; nunca recorrem a dados demo ou à API Go.
- Cálculos financeiros ficam em `src/domain` como funções puras (`npm run check:domain`).
  A IA, quando integrada, só interpretará resultados já calculados.

## Banco de dados

Migrations em `supabase/migrations`, teste de isolamento em `supabase/tests`. Ver `docs/SUPABASE.md`.
Posições não são gravadas: são recalculadas a partir das transações por `domain/positions.ts`.

## Design system

- Tokens em `src/styles/theme.css` (cores em canais RGB, raios, sombras, curvas de animação).
  As escalas `dark`, `primary`, `green`, `red`, `yellow`, `blue` e a cor `white` (superfície dos
  painéis) do Tailwind leem essas variáveis; para mudar a identidade, altere só esse arquivo.
- No tema escuro, a escala `dark` vai do fundo (`dark-50`) ao texto de maior contraste (`dark-900`).
- Classes compartilhadas em `src/index.css`: `panel`, `panel-raised`, `chip-live`,
  `chip-building`, `chip-planned`, `text-display`, `bg-grid`.
- Fontes hospedadas no projeto: Unbounded (títulos) e Inter (interface, algarismos tabulares).
- Componentes de marca em `components/brand`; gráficos reutilizáveis em `components/charts`.
- `prefers-reduced-motion` desativa animações globalmente.
