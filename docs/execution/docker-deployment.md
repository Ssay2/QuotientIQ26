# Docker Deployment

## Local Development

Start all services (web, API, PostgreSQL, Redis):

```bash
docker-compose up
```

Access:
- Web: http://localhost:3000
- API: http://localhost:4000/api/health

Stop:

```bash
docker-compose down
```

## Production Deployment

Build images:

```bash
docker-compose -f docker-compose.prod.yml build
```

Run with environment file:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Verify health:

```bash
curl http://localhost:4000/api/health
```

## Environment Variables (Production)

Create `.env.prod`:

```
POSTGRES_USER=quotientiq
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=quotientiq_prod
REDIS_PASSWORD=<strong-password>
CORS_ORIGIN=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
STRIPE_SECRET_KEY=sk_...
CLERK_SECRET_KEY=sk_...
```

## Logs

```bash
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres
```

## Cleanup

Remove containers and volumes:

```bash
docker-compose down -v
```
