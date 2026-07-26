# QuotientIQ Dev Quickstart

## Prerequisites

- Node.js 20+
- npm 10+

## Install

```bash
npm install
```

## Environment Setup

1. Copy root env:

```bash
cp .env.example .env
```

2. Copy web env:

```bash
cp apps/web/.env.example apps/web/.env.local
```

3. Copy API env:

```bash
cp apps/api/.env.example apps/api/.env
```

## Run Services

### Option A: Using npm (local)

1. Start API:

```bash
npm run dev:api
```

2. In a second terminal, start web:

```bash
npm run dev:web
```

### Option B: Using Docker Compose (recommended)

One command starts web, API, PostgreSQL, and Redis:

```bash
docker-compose up
```

## Verify

- Web app: http://localhost:3000
- API health: http://localhost:4000/api/health
- Workflow list: http://localhost:4000/api/workflows

## Docker Notes

See [Docker Deployment Guide](docker-deployment.md) for production builds and multi-environment support.
