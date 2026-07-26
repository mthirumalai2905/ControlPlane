# Control Plane

**Control Plane** — AI Integration Operating System for enterprises — the IT department for AI employees.

Onboard any supported connector in minutes: discover → install → authenticate → validate →
monitor → repair. No manual configuration.

## Phase 0 — Foundation

This repo currently implements **Phase 0**: infra, schema, API skeleton, dashboard shell, and a **manual (non-AI) install path** for one hardcoded MCP server (`filesystem`) to validate the execution sandbox end-to-end.

| Component | Status |
|---|---|
| Postgres schema + Alembic | ✅ |
| FastAPI control plane | ✅ |
| Next.js dashboard shell | ✅ |
| Execution sandbox (Docker) | ✅ |
| Manual install (filesystem MCP) | ✅ |
| Celery job skeleton | ✅ |
| Control Plane agent loop / DeepSeek | Phase 1 |

## Quick start

### Prerequisites

- **Docker Desktop running** (Windows: start Docker Desktop before `compose up`)
- Python 3.12+
- Node.js 20+

### 1. Start infrastructure

```bash
# Ensure Docker Desktop is running, then:
docker compose up -d postgres redis
```

### 2. API

```bash
cd apps/api
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn hermes_api.main:app --reload --port 8000
```

### 3. Web

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). API docs: [http://localhost:8000/docs](http://localhost:8000/docs).

### 4. Walking skeleton — install filesystem MCP

```bash
curl -X POST http://localhost:8000/api/v1/servers/install \
  -H "Content-Type: application/json" \
  -d "{\"registry_entry_slug\": \"filesystem\", \"workspace_id\": \"<workspace-uuid>\"}"
```

Or use **Registry → Install** in the dashboard after seeding:

```bash
cd apps/api && python -m hermes_api.seed
```

## Monorepo layout

```
apps/
  api/                 FastAPI control plane
  web/                 Next.js dashboard
packages/
  shared-types/        Pydantic models (single source of truth)
services/
  registry/            Catalog CRUD
  installer/           Manual + future AI install paths
  execution-sandbox/   Docker / FS primitives
  configurator/        Config generation
  validator/           Liveness + MCP handshake stubs
docker-compose.yml
```

## Roadmap

- **Phase 0** — Foundation (this)  
- **Phase 1** — Control Plane agent loop, docs reader, docker install, AI Activity Feed  
- **Phase 2** — npm/pip/uv, auth types, monitoring, self-healing  
- **Phase 3** — Trust levels, blue/green updates, discovery automation  
- **Phase 4** — Multi-tenant hardening, observability, CLI  

See the product spec for full architecture, security model, and module contracts.
