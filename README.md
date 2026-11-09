# AI Wealth Advisor

Sistema completo de gestão de investimentos com inteligência artificial, construído com Go, React, TypeScript, PostgreSQL e OpenAI.

## 🏗️ Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│   PostgreSQL    │
│   (React/TS)    │     │    (Go/Gin)     │     │   (Database)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │  Redis   │ │  OpenAI  │ │  yfinance│
             │ (Cache)  │ │   (AI)   │ │(Market)  │
             └──────────┘ └──────────┘ └──────────┘
```

## 🚀 Início Rápido

### Pré-requisitos

- Docker & Docker Compose
- Go 1.22+ (para desenvolvimento local)
- Node.js 20+ (para desenvolvimento local)
- PostgreSQL 15+ (se não usar Docker)

### Com Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/ai-wealth-advisor.git
cd ai-wealth-advisor

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves (OPENAI_API_KEY, JWT_SECRET, etc.)

# Suba todos os serviços
docker-compose up -d

# Acesse:
# Frontend: http://localhost
# Backend API: http://localhost:8080
# PgAdmin: http://localhost:5050 (profile tools)
```

### Desenvolvimento Local

#### Backend

```bash
cd backend
go mod download
go run ./cmd/server
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📁 Estrutura do Projeto

```
ai-wealth-advisor/
├── backend/                    # Go Backend
│   ├── cmd/server/            # Entry point
│   ├── internal/
│   │   ├── auth/              # Autenticação (JWT, Register, Login)
│   │   ├── asset/             # Ativos (Ações, FIIs, ETFs, etc.)
│   │   ├── portfolio/         # Carteiras e Posições
│   │   ├── transaction/       # Transações (Compra/Venda)
│   │   ├── marketdata/        # Dados de Mercado (yfinance)
│   │   ├── analytics/         # Métricas de Risco/Retorno
│   │   ├── ai/                # Integração OpenAI GPT-4o
│   │   ├── sentiment/         # Análise de Sentimento
│   │   ├── simulation/        # Monte Carlo, Backtesting
│   │   ├── alert/             # Sistema de Alertas
│   │   ├── config/            # Configuração Centralizada
│   │   ├── database/          # PostgreSQL + GORM
│   │   └── routes/            # Rotas da API
│   ├── go.mod
│   └── Dockerfile
├── frontend/                   # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/        # Componentes Reutilizáveis
│   │   │   ├── common/        # UI Components (Button, Input, Card, etc.)
│   │   │   └── layout/        # Sidebar, Header, Layouts
│   │   ├── pages/             # Páginas da Aplicação
│   │   ├── services/          # API Services (axios)
│   │   ├── store/             # Zustand Stores
│   │   ├── types/             # TypeScript Interfaces
│   │   ├── utils/             # Utilitários
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🔧 Funcionalidades

### Fase 1 - Fundação ✅
- [x] Autenticação JWT com Refresh Tokens
- [x] Registro/Login com perfil de risco (Conservador/Moderado/Arrojado)
- [x] CRUD de Carteiras
- [x] CRUD de Ativos (Ações, FIIs, ETFs, Renda Fixa, Cripto, Internacional)
- [x] CRUD de Transações (Compra/Venda)
- [x] Integração yfinance para dados de mercado
- [x] Cache Redis

### Fase 2 - Portfolio & Analytics ✅
- [x] Dashboard com resumo de carteiras
- [x] Posições com ganho/perda não realizado
- [x] Histórico de transações
- [x] Analytics: Volatilidade, Sharpe, Max Drawdown, Beta, VaR
- [x] Matriz de Correlação
- [x] Gráficos de performance (Recharts)

### Fase 3 - IA & Alertas ✅
- [x] Recomendações com OpenAI GPT-4o (Function Calling)
- [x] Análise de carteira (Risk Score, Diversificação)
- [x] Chat com IA sobre investimentos
- [x] Insights de mercado automatizados
- [x] Sistema de Alertas (10 tipos):
  - Preço Acima/Abaixo
  - Variação Percentual
  - Pico de Volume
  - RSI Sobrecomprado/Sobrevendido
  - Cruzamento MACD
  - Valor da Carteira
  - Drawdown
  - Concentração
  - Sentimento de Notícias
- [x] Testar alertas em tempo real

### Fase 4 - Simulações Avançadas ✅
- [x] Monte Carlo Simulation
- [x] Backtesting Histórico
- [x] Stress Testing
- [x] Visualização de caminhos e distribuição

## 🔌 API Endpoints

### Autenticação
```
POST   /api/auth/register     # Registrar usuário
POST   /api/auth/login        # Login
POST   /api/auth/refresh      # Refresh token
POST   /api/auth/logout       # Logout
GET    /api/auth/me           # Perfil do usuário
PUT    /api/auth/profile      # Atualizar perfil
PUT    /api/auth/password     # Alterar senha
```

### Carteiras
```
GET    /api/portfolios              # Listar carteiras
POST   /api/portfolios              # Criar carteira
GET    /api/portfolios/:id          # Obter carteira
PUT    /api/portfolios/:id          # Atualizar carteira
DELETE /api/portfolios/:id          # Deletar carteira
GET    /api/portfolios/:id/summary  # Resumo da carteira
GET    /api/portfolios/:id/positions # Posições
GET    /api/portfolios/:id/transactions # Transações
GET    /api/portfolios/:id/performance # Performance
GET    /api/portfolios/:id/allocation  # Alocação
GET    /api/portfolios/:id/rebalance   # Sugestões de rebalanceamento
```

### Ativos
```
GET    /api/assets              # Listar ativos (com filtros)
GET    /api/assets/search       # Buscar ativos
GET    /api/assets/:id          # Obter ativo
POST   /api/assets              # Criar ativo (admin)
PUT    /api/assets/:id          # Atualizar ativo (admin)
DELETE /api/assets/:id          # Deletar ativo (admin)
GET    /api/assets/:id/prices   # Histórico de preços
```

### Transações
```
GET    /api/transactions              # Listar transações
POST   /api/transactions              # Criar transação
GET    /api/transactions/:id          # Obter transação
PUT    /api/transactions/:id          # Atualizar transação
DELETE /api/transactions/:id          # Deletar transação
POST   /api/transactions/bulk         # Importação em lote
GET    /api/transactions/export       # Exportar CSV
```

### Dados de Mercado
```
GET    /api/market/quote/:symbol      # Cotação atual
GET    /api/market/candles/:symbol    # Velas (candles)
GET    /api/market/fundamentals/:symbol # Fundamentais
GET    /api/market/watchlist          # Watchlist
GET    /api/market/search             # Buscar símbolos
```

### IA
```
POST   /api/ai/recommendations        # Gerar recomendações
POST   /api/ai/analyze                # Analisar carteira
POST   /api/ai/insights               # Insights de mercado
POST   /api/ai/chat                   # Chat com IA
```

### Alertas
```
GET    /api/alerts              # Listar alertas
POST   /api/alerts              # Criar alerta
GET    /api/alerts/:id          # Obter alerta
PUT    /api/alerts/:id          # Atualizar alerta
DELETE /api/alerts/:id          # Deletar alerta
POST   /api/alerts/:id/test     # Testar alerta
GET    /api/alerts/history      # Histórico de disparos
```

### Simulações
```
GET    /api/simulations              # Listar simulações
POST   /api/simulations              # Criar simulação
GET    /api/simulations/:id          # Obter simulação
POST   /api/simulations/:id/run      # Executar simulação
GET    /api/simulations/:id/results  # Resultados
DELETE /api/simulations/:id          # Deletar simulação
```

### Analytics
```
GET    /api/analytics/:portfolioId   # Analytics completos
```

## 🐳 Deploy

### Railway (Backend)
```bash
# Conecte seu repositório ao Railway
# Configure as variáveis de ambiente
# Deploy automático
```

### Render (Backend)
```bash
# Crie um Web Service
# Build Command: docker build -f Dockerfile.backend .
# Start Command: ./server
```

### Vercel (Frontend)
```bash
# Conecte o repositório
# Framework: Vite
# Build Command: npm run build
# Output Directory: dist
```

### Variáveis de Ambiente de Produção
```env
SERVER_MODE=release
JWT_SECRET=<chave-secreta-forte-64-chars>
OPENAI_API_KEY=<sua-chave-openai>
DB_PASSWORD=<senha-forte-postgres>
REDIS_PASSWORD=<senha-redis>
CORS_ALLOWED_ORIGINS=https://seu-dominio.com
```

## 🛠️ Stack Tecnológico

### Backend
- **Go 1.22** - Linguagem principal
- **Gin** - Framework HTTP
- **GORM** - ORM para PostgreSQL
- **JWT-Go** - Autenticação
- **Redis** - Cache e sessões
- **OpenAI Go SDK** - Integração GPT-4o
- **yfinance (Python)** - Dados de mercado

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **Zustand** - State Management
- **TanStack Query** - Server State
- **React Hook Form + Zod** - Forms & Validation
- **Recharts** - Gráficos
- **Lucide React** - Ícones
- **Axios** - HTTP Client

### Infraestrutura
- **PostgreSQL 15** - Database
- **Redis 7** - Cache
- **Docker** - Containerização
- **Nginx** - Reverse Proxy (Frontend)

## 📝 Scripts Úteis

```bash
# Backend
cd backend
go run ./cmd/server          # Rodar servidor
go test ./...                # Testes
go vet ./...                 # Lint
gofmt -w .                   # Format

# Frontend
cd frontend
npm run dev                  # Dev server
npm run build                # Build produção
npm run preview              # Preview build
npm run lint                 # ESLint
npm run type-check           # TypeScript check

# Docker
docker-compose up -d         # Subir tudo
docker-compose down          # Parar tudo
docker-compose logs -f       # Logs
docker-compose exec backend sh # Shell no backend
```

## 🔐 Segurança

- ✅ JWT com Access + Refresh Tokens
- ✅ Bcrypt para hash de senhas
- ✅ Rate Limiting nas APIs
- ✅ CORS configurável
- ✅ Helmet headers (via Gin middleware)
- ✅ Validação de entrada (Zod + Go)
- ✅ Non-root containers
- ✅ Secrets via variáveis de ambiente
- ✅ Health Checks em todos os serviços

## 📊 Monitoramento

- Health Check: `GET /health`
- Métricas: Prometheus (planejado)
- Logs: Structured JSON logging
- Tracing: OpenTelemetry (planejado)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Equipe

- **Desenvolvedor**: [Seu Nome]
- **Projeto**: Faculdade / TCC
- **Ano**: 2024

## 🙏 Agradecimentos

- OpenAI pela API GPT-4o
- yfinance por dados de mercado gratuitos
- Comunidade Go e React pelas excelentes ferramentas
