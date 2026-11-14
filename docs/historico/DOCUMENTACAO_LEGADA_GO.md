# 📚 DOCUMENTAÇÃO COMPLETA — AI Wealth Advisor

> Sistema completo de gestão de investimentos com IA — Go backend + React frontend + PostgreSQL + OpenAI

---

## 1. Visão Geral

O **AI Wealth Advisor** é um sistema full-stack para gestão de carteiras de investimentos com inteligência artificial integrada. O projeto permite cadastro de usuários, criação de carteiras, acompanhamento de ativos, recomendações geradas por IA (OpenAI GPT-4o), alertas personalizados, simulações de Monte Carlo, análise de sentimento de mercado e muito mais.

### Objetivo
Fornecer uma plataforma completa para investidores acompanharem seus ativos, receberem insights de IA e gerenciarem alertas em tempo real.

---

## 2. Tecnologias e Linguagens Usadas

| Camada | Tecnologia | Versão | Uso |
|--------|-----------|--------|-----|
| Backend | **Go (Golang)** | 1.22 | API REST, autenticação, lógica de negócio |
| Web Framework Backend | **Gin** | v1.9.1 | Roteamento HTTP, middlewares, CORS |
| ORM | **GORM** | v1.25.5 | Mapeamento objeto-relacional, AutoMigrate |
| Banco de Dados | **PostgreSQL** | 15 | Persistência de dados |
| Cache / Message Broker | **Redis** | 7 | Cache, filas de background workers |
| Banco de Vetores/Relacional adicional | pgAdmin | — | Gerenciamento visual do banco |
| Autenticação | **JWT** (jsonwebtoken) | v5.2.1 | Tokens de acesso e refresh |
| Criptografia | **bcrypt** | — | Hash de senhas |
| UUID | **google/uuid** | v1.5.0 | Identificadores únicos |
| Decimal | **shopspring/decimal** | v1.3.1 | Cálculos financeiros precisos |
| IA | **OpenAI GPT-4o** | — | Recomendações, análise de carteira, chat |
| Market Data | **yfinance** | Python | Dados de mercado gratuitos (sem API key) |
| Frontend | **React** | 18.3.1 | Interface do usuário |
| Linguagem Frontend | **TypeScript** | 5.2.2 | Tipagem estática |
| Build Tool | **Vite** | 5.2.0 | Empacotamento e dev server |
| Estilização | **Tailwind CSS** | 3.4.3 | CSS utility-first |
| State Management | **Zustand** | 4.5.2 | Gerenciamento de estado global |
| Server State | **TanStack Query (React Query)** | 5.28.4 | Cache de servidor, sincronização |
| Formulários | **React Hook Form** | 7.51.0 | Gerenciamento de formulários |
| Validação | **Zod** | 3.22.4 | Schemas de validação |
| Gráficos | **Recharts** | 2.12.3 | Visualizações de dados |
| Ícones | **Lucide React** | 0.363.0 | Ícones SVG |
| HTTP Client | **Axios** | 1.6.8 | Requisições à API |
| Containerização | **Docker** | — | Multi-container deployment |
| Web Server Frontend | **Nginx** | — | Servir SPA em produção |

---

## 3. Estrutura do Projeto (Monorepo)

```
ai-wealth-advisor/
├── backend/                    # Backend Go (Gin + GORM)
│   ├── cmd/server/
│   │   └── main.go             # Entry point, bootstrap, graceful shutdown
│   ├── internal/
│   │   ├── auth/               # Autenticação (register, login, JWT, refresh)
│   │   ├── asset/              # Ativos (ações, FIIs, ETFs, etc.)
│   │   ├── portfolio/          # Carteiras de investimento
│   │   ├── transaction/        # Transações (compra/venda)
│   │   ├── marketdata/         # Dados de mercado via yfinance
│   │   ├── analytics/          # Métricas de risco (Sharpe, Drawdown, VaR)
│   │   ├── ai/                 # Integração OpenAI GPT-4o
│   │   ├── sentiment/          # Análise de sentimento (Fear & Greed)
│   │   ├── simulation/         # Simulações Monte Carlo, backtesting
│   │   ├── alert/              # Sistema de alertas (10 tipos)
│   │   ├── config/             # Carregamento de variáveis de ambiente
│   │   ├── database/           # Conexão PostgreSQL, AutoMigrate, seed
│   │   ├── routes/             # Todas as rotas da API + middlewares
│   │   ├── middleware/         # JWT auth middleware, CORS
│   │   └── report/             # Relatórios
│   ├── go.mod                  # Dependências Go
│   ├── go.sum
│   ├── docker/                 # Arquivos Docker do backend
│   ├── migrations/             # Migrações SQL
│   └── pkg/                    # Pacotes compartilhados
├── frontend/                   # Frontend React + TypeScript + Vite
│   ├── src/
│   │   ├── main.tsx            # Entry point com providers
│   │   ├── App.tsx             # Roteamento principal
│   │   ├── index.css           # Tailwind base styles
│   │   ├── vite-env.d.ts       # Tipos do Vite
│   │   ├── pages/              # 10 páginas (Login, Register, Dashboard, etc.)
│   │   ├── store/              # Zustand stores (authStore, portfolioStore)
│   │   ├── services/           # 7 serviços de API (axios)
│   │   ├── components/         # UI components + Layout
│   │   ├── types/              # 50+ interfaces TypeScript
│   │   └── utils/              # Utilitários (formatação, gráficos)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
├── docker-compose.yml          # Orquestração de 6 containers
├── Dockerfile.backend          # Multi-stage build Go
├── Dockerfile.frontend         # Node 20 + Nginx
├── .env.example                # Template de variáveis de ambiente
├── backend/.env                # Configuração do backend (criado)
├── SETUP.md                    # Guia de instalação
└── README.md                   # Documentação principal
```

---

## 4. Backend — Detalhes Técnicos

### 4.1 Linguagem e Framework
- **Linguagem:** Go 1.22
- **Framework web:** Gin
- **ORM:** GORM com driver `lib/pq` para PostgreSQL

### 4.2 Modelos de Dados (11 modelos)

| Modelo | Descrição | Campos principais |
|--------|-----------|-------------------|
| `User` | Usuário do sistema | id, name, email, password (hash bcrypt), risk_profile |
| `RefreshToken` | Token de renovação JWT | id, user_id, token, expires_at |
| `Portfolio` | Carteira de investimentos | id, user_id, name, total_value, risk_profile |
| `PortfolioAsset` | Ativo dentro de uma carteira | portfolio_id, asset_id, quantity, average_price |
| `Asset` | Ativo financeiro | id, symbol, name, class, country, sector, is_active |
| `Transaction` | Compra/venda de ativo | id, portfolio_id, asset_id, type (buy/sell), quantity, price, fees |
| `MarketData` | Cotação de mercado | id, asset_id, timestamp, open, high, low, close, volume |
| `Recommendation` | Recomendação da IA | id, portfolio_id, action, asset, quantity, target_price, confidence |
| `Alert` | Alerta configurado | id, portfolio_id, type, condition, threshold, enabled |
| `Simulation` | Simulação Monte Carlo | id, user_id, portfolio_id, parameters, results |
| `AlertHistory` | Histórico de disparos de alerta | id, alert_id, triggered_at, message |

### 4.3 Serviços Principais

#### Auth Service (`internal/auth/`)
- `Register` — cadastro de novo usuário com hash de senha (bcrypt)
- `Login` — autenticação e geração de JWT (access + refresh tokens)
- `RefreshToken` — renovação de token de acesso
- `Logout` — invalidação de sessão
- `ValidateToken` — verificação de token JWT
- **JWT:** HS256, expiração configurável (padrão 24h acesso, 7d refresh)

#### Asset Service (`internal/asset/`)
- CRUD completo de ativos
- Filtro por classe (Ações, FIIs, ETFs, Renda Fixa, Cripto, Internacional)
- Busca por símbolo, nome, país, setor

#### Portfolio Service (`internal/portfolio/`)
- CRUD de carteiras por usuário
- Cálculo de valor total da carteira
- Alocação por ativo

#### Transaction Service (`internal/transaction/`)
- Registro de compra e venda
- Cálculo de preço médio
- Histórico de transações

#### MarketData Service (`internal/marketdata/`)
- Integração com **yfinance** via subprocess Python
- Busca de cotações históricas e em tempo real
- Sincronização em background (a cada 15 minutos)

#### Analytics Service (`internal/analytics/`)
- Retorno da carteira
- Volatilidade
- Índice de Sharpe
- Max Drawdown
- Correlação entre ativos
- Beta
- VaR (Value at Risk)
- Simulação de Monte Carlo

#### AI Service (`internal/ai/`)
- **OpenAI GPT-4o** com function calling
- `GenerateRecommendation` — recomendações de compra/venda/manter
- `AnalyzePortfolio` — análise completa de risco e diversificação
- `GenerateInsights` — insights de mercado
- `ChatCompletion` — chat com a IA sobre investimentos
- Funções disponíveis para a IA: buy, sell, rebalance, analyze_portfolio

#### Sentiment Service (`internal/sentiment/`)
- Índice Fear & Greed
- Análise de sentimento de notícias
- Análise de sentimento de redes sociais

#### Simulation Service (`internal/simulation/`)
- Simulação Monte Carlo
- Backtesting histórico
- Stress testing

#### Alert Service (`internal/alert/`)
- 10 tipos de alerta:
  1. price_above — preço acima de
  2. price_below — preço abaixo de
  3. percent_change — variação percentual
  4. volume_spike — pico de volume
  5. rsi_overbought — RSI sobrecomprado
  6. rsi_oversold — RSI sobrevendido
  7. macd_cross — cruzamento MACD
  8. portfolio_value — valor da carteira
  9. drawdown — drawdown
  10. concentration — concentração
- `AlertHistory` — registro de disparos
- Worker de verificação a cada 1 minuto

### 4.4 Middleware
- **JWT Auth Middleware** — validação de tokens em rotas protegidas
- **CORS** — configuração para permitir requisições do frontend
- **Health Check** — endpoint `/health` para monitoramento

### 4.5 Rotas da API

#### Autenticação
```
POST /api/register     — Cadastro
POST /api/login        — Login
POST /api/refresh      — Renovar token
POST /api/logout       — Logout
```

#### Ativos
```
GET    /api/assets              — Listar ativos
GET    /api/assets/:id          — Obter ativo
POST   /api/assets              — Criar ativo
PUT    /api/assets/:id          — Atualizar ativo
DELETE /api/assets/:id          — Deletar ativo
```

#### Carteiras
```
GET    /api/portfolios              — Listar carteiras
GET    /api/portfolios/:id          — Obter carteira
POST   /api/portfolios              — Criar carteira
PUT    /api/portfolios/:id          — Atualizar carteira
DELETE /api/portfolios/:id          — Deletar carteira
```

#### Transações
```
GET    /api/transactions              — Listar transações
POST   /api/transactions              — Criar transação
GET    /api/transactions/:id          — Obter transação
PUT    /api/transactions/:id          — Atualizar transação
DELETE /api/transactions/:id          — Deletar transação
```

#### IA
```
POST /api/ai/recommendations   — Recomendações da IA
POST /api/ai/analyze           — Análise de carteira
POST /api/ai/insights          — Insights de mercado
POST /api/ai/chat              — Chat com IA
```

#### Alertas
```
GET    /api/alerts                  — Listar alertas
POST   /api/alerts                  — Criar alerta
PUT    /api/alerts/:id              — Atualizar alerta
DELETE /api/alerts/:id              — Deletar alerta
POST   /api/alerts/:id/test         — Testar alerta
GET    /api/alerts/history          — Histórico de alertas
```

#### Mercado
```
GET    /api/marketdata/quotes       — Cotações
GET    /api/marketdata/history      — Histórico de preços
GET    /api/marketdata/search       — Buscar ativos
```

---

## 5. Frontend — Detalhes Técnicos

### 5.1 Linguagem e Framework
- **Linguagem:** TypeScript 5.2.2
- **Framework:** React 18.3.1
- **Build Tool:** Vite 5.2.0
- **Estilização:** Tailwind CSS 3.4.3

### 5.2 Gerenciamento de Estado

| Store | Propósito |
|-------|-----------|
| `authStore.tsx` | Autenticação (login, register, logout, token, usuário) |
| `portfolioStore.tsx` | Carteiras, ativos, transações, atualização em tempo real |
| `uiStore.ts` | Estado da UI (tema, notificações, modais) |

### 5.3 Serviços de API (axios com interceptores)

| Serviço | Funções |
|---------|---------|
| `authService` | register, login, refresh, logout, me, changePassword |
| `portfolioService` | CRUD, summary, performance, allocation, rebalance |
| `assetService` | list, get, search, create, update, delete |
| `transactionService` | CRUD, bulk import, CSV export |
| `marketDataService` | quotes, history, search, watchlist, SSE |
| `aiService` | recommendations, analyze, insights, chat, streamChat |
| `alertService` | CRUD, history, test alert, WebSocket |

### 5.4 Páginas (10 páginas)

| Página | Descrição |
|--------|-----------|
| `LoginPage.tsx` | Tela de login com validação de formulário |
| `RegisterPage.tsx` | Cadastro com seleção de perfil de risco |
| `DashboardPage.tsx` | Visão geral: resumo da carteira, gráficos, transações recentes |
| `PortfoliosPage.tsx` | Lista de carteiras do usuário |
| `PortfolioDetailPage.tsx` | Detalhe da carteira com holdings e performance |
| `AIAnalysisPage.tsx` | Recomendações IA, análise de risco, chat com IA |
| `AnalyticsPage.tsx` | Métricas avançadas (Sharpe, Drawdown, VaR, etc.) |
| `AlertsPage.tsx` | Lista, criação e edição de alertas (10 tipos) |
| `SimulationsPage.tsx` | Simulações Monte Carlo e backtesting |
| `SettingsPage.tsx` | Configurações do usuário |

### 5.5 Componentes UI (7 componentes)

| Componente | Descrição |
|------------|-----------|
| `Button.tsx` | Botão com variantes (primary, secondary, ghost, etc.) |
| `Input.tsx` | Campo de entrada com label e validação |
| `Card.tsx` | Card com header, body e footer |
| `Table.tsx` | Tabela com colunas customizáveis |
| `Modal.tsx` | Modal com portal e controle de abertura |
| `Select.tsx` | Select com opções e busca |
| `Chart.tsx` | Wrapper para gráficos Recharts |

### 5.6 Layout (2 componentes)

| Componente | Descrição |
|------------|-----------|
| `Sidebar.tsx` | Navegação lateral com links das páginas |
| `Header.tsx` | Cabeçalho com notificações, tema, perfil do usuário |

### 5.7 Tipos TypeScript (50+ interfaces)
Todas as interfaces correspondem exatamente aos modelos do backend Go, garantindo type safety completo entre frontend e backend.

---

## 6. Infraestrutura e Docker

### 6.1 docker-compose.yml — 6 Serviços

| Serviço | Imagem | Porta | Função |
|---------|--------|-------|--------|
| postgres | postgres:15 | 5432 | Banco de dados principal |
| redis | redis:7 | 6379 | Cache e workers |
| backend | go:1.22 | 8080 | API Go (Gin) |
| frontend | node:20 + nginx | 80 | SPA React (buildado) |
| pgadmin | dpage/pgadmin4 | 5050 | Gerenciamento visual do banco |

### 6.2 Dockerfile.backend
- Multi-stage build (build + runtime)
- Go 1.22
- Usuário não-root para segurança
- Health check na porta 8080

### 6.3 Dockerfile.frontend
- Node 20 para build
- Nginx para servir SPA em produção
- Configuração de SPA routing (fallback para index.html)

### 6.4 Redes e Volumes
- Rede interna `ai-wealth-network`
- Volumes persistentes para dados do PostgreSQL e Redis

---

## 7. Configuração de Ambiente (.env)

O arquivo `backend/.env` contém todas as variáveis necessárias:

```env
# Servidor
SERVER_PORT=8080
SERVER_MODE=debug

# Banco de dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ai_wealth_advisor

# JWT
JWT_SECRET=sua-chave-secreta-aqui
JWT_EXPIRY_HOURS=24
JWT_REFRESH_EXPIRY_DAYS=7

# OpenAI
OPENAI_API_KEY=sua-chave-openai
OPENAI_MODEL=gpt-4o

# Market Data
MARKET_DATA_PROVIDER=yfinance  # Gratuito, sem API key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

**⚠️ Importante:** Nunca commitar credenciais reais. Use [REDACTED] placeholders em repositórios públicos.

---

## 8. Como Funciona End-to-End

### Fluxo de Usuário Completo

1. **Cadastro:** Usuário acessa `/register`, preenche nome, email, senha e perfil de risco (conservador/moderado/arrojado)
2. **Login:** Usuário acessa `/login`, recebe JWT access + refresh tokens
3. **Criar Carteira:** Usuário cria uma ou mais carteiras com nome e perfil de risco
4. **Adicionar Ativos:** Usuário adiciona ativos à carteira (PETR4, VALE3, etc.)
5. **Registrar Transações:** Usuário registra compras e vendas com quantidade e preço
6. **Recomendações IA:** Usuário solicita análise da IA → OpenAI GPT-4o analisa a carteira e sugere ações
7. **Alertas:** Usuário configura alertas (ex: "PETR4 acima de R$ 30")
8. **Monitoramento:** Sistema verifica alertas a cada 1 minuto e notifica quando disparados
9. **Analytics:** Usuário visualiza métricas de risco (Sharpe, Drawdown, VaR, etc.)

### Fluxo de Dados Interno

```
Cliente (React) → Axios → API Gateway (Gin) → Middleware JWT → Service → GORM → PostgreSQL
                                    ↓
                              Background Workers (yfinance, alerts, sentiment)
                                    ↓
                              OpenAI API (recomendações, análise, chat)
```

---

## 9. Segurança

- Senhas criptografadas com bcrypt
- JWT com access token (curto prazo) e refresh token (longo prazo)
- Middleware de autenticação em todas as rotas protegidas
- CORS configurado para aceitar apenas o frontend
- Usuário não-root nos containers Docker
- Variáveis sensíveis em `.env` (não versionadas)

---

## 10. Guia de Instalação Rápida

### Opção A: Docker (Recomendado)

```powershell
# 1. Clone/abra o projeto
cd C:\Users\supor\ai-wealth-advisor

# 2. Configure o .env (coloque sua OPENAI_API_KEY)
# Edite backend/.env

# 3. Suba todos os containers
docker-compose up -d

# 4. Acesse
# Frontend: http://localhost:5173
# API: http://localhost:8080/health
```

### Opção B: Sem Docker (Desenvolvimento)

```powershell
# Backend (requer Go 1.22 + PostgreSQL)
cd backend
go mod tidy
go run ./cmd/server/

# Frontend
cd frontend
npm install
npm run dev
```

### Opção C: Backend Mock (Python, para teste imediato)

```powershell
# Backend mock
cd backend
pip install flask
python mock_backend.py

# Frontend
cd frontend
npm install
npm run dev
```

---

## 11. Limitações e Próximos Passos

### Estado Atual
- ✅ Frontend build verificado e funcional
- ✅ Backend Go completo com todos os modelos e serviços
- ✅ Docker-compose configurado
- ✅ Documentação completa
- ⚠️ Backend Go requer instalação de Go + PostgreSQL para rodar localmente
- ⚠️ OpenAI API Key necessária para funcionalidades de IA
- ⚠️ Testes automatizados não implementados

### Melhorias Futuras Sugeridas
1. Implementar testes unitários e de integração
2. Adicionar WebSocket para atualizações em tempo real
3. Implementar exportação de relatórios PDF/Excel
4. Adicionar mais provedores de dados de mercado
5. Autenticação OAuth2 (Google, etc.)
6. Notificações por email para alertas
7. API de webhook para integrações externas

---

## 12. Arquivos Principais

| Arquivo | Caminho | Descrição |
|---------|---------|-----------|
| Entry Point Backend | `backend/cmd/server/main.go` | Bootstrap da aplicação Go |
| Entry Point Frontend | `frontend/src/main.tsx` | Providers e renderização React |
| Rotas API | `backend/internal/routes/routes.go` | Todas as rotas da API |
| Configuração | `backend/internal/config/config.go` | Carregamento de variáveis de ambiente |
| Banco de Dados | `backend/internal/database/db.go` | Conexão PostgreSQL + AutoMigrate |
| Tipos TypeScript | `frontend/src/types/index.ts` | 50+ interfaces TypeScript |
| Serviço API | `frontend/src/services/api.ts` | Axios com interceptores de auth |
| Docker Compose | `docker-compose.yml` | Orquestração de containers |
| Variáveis de Ambiente | `backend/.env` | Configuração de ambiente (editar) |

---

## 13. Contato e Suporte

Para dúvidas sobre o projeto, consulte o `README.md` ou o `SETUP.md` incluídos no repositório.

---

*Documentação gerada automaticamente para o projeto AI Wealth Advisor — Todos os direitos reservados.*
