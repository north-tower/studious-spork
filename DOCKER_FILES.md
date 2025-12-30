# Docker Deployment Files Overview

This document describes all the Docker-related files created for deploying the backend to a VPS.

## Files Created

### Core Docker Files

1. **Dockerfile**
   - Multi-stage build for optimized production image
   - Uses Node.js 20 Alpine for smaller image size
   - Includes Prisma Client generation
   - Runs as non-root user for security
   - Includes health check endpoint

2. **docker-compose.yml**
   - Orchestrates backend and PostgreSQL services
   - Handles networking and volumes
   - Includes health checks and dependencies
   - Auto-runs migrations on startup

3. **docker-compose.prod.yml**
   - Production overrides for docker-compose.yml
   - Optimized PostgreSQL settings
   - Enhanced logging configuration
   - Use with: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

4. **.dockerignore**
   - Excludes unnecessary files from Docker build context
   - Reduces build time and image size
   - Excludes node_modules, .env files, git files, etc.

5. **docker-entrypoint.sh**
   - Startup script that runs migrations before starting the server
   - Handles database readiness checks
   - Executed by the container on startup

### Deployment Scripts

6. **deploy.sh**
   - Automated deployment script
   - Checks prerequisites
   - Builds and starts containers
   - Verifies deployment health
   - Usage: `./deploy.sh [environment]`

7. **Makefile**
   - Convenient commands for common tasks
   - Examples:
     - `make up` - Start containers
     - `make down` - Stop containers
     - `make logs` - View logs
     - `make migrate` - Run migrations
     - `make backup` - Backup database

### Documentation

8. **DEPLOYMENT.md**
   - Comprehensive deployment guide
   - Step-by-step instructions
   - Security best practices
   - Troubleshooting section
   - Production checklist

9. **QUICK_START.md**
   - Condensed quick start guide
   - Essential commands only
   - For experienced users

10. **.env.example** (if created)
    - Template for environment variables
    - Copy to .env and fill in values

## Quick Reference

### First Time Deployment

```bash
# 1. Create .env file
cp .env.example .env
nano .env  # Edit with your values

# 2. Deploy
./deploy.sh
```

### Using Docker Compose Directly

```bash
# Build and start
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Using Makefile

```bash
# See all commands
make help

# Common commands
make up          # Start
make down        # Stop
make logs         # View logs
make migrate      # Run migrations
make backup       # Backup database
```

## Environment Variables

Required in `.env` file:

- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password (use strong password)
- `POSTGRES_DB` - Database name
- `JWT_SECRET` - Secret key for JWT tokens (generate with `openssl rand -base64 32`)
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)
- `PORT` - Backend port (default: 3000)
- `NODE_ENV` - Environment (production)

## Architecture

```
┌─────────────────┐
│   Nginx (80/443) │  ← Reverse proxy (optional)
└────────┬─────────┘
         │
┌────────▼─────────┐
│  Backend (3000)   │  ← Node.js/Express API
└────────┬─────────┘
         │
┌────────▼─────────┐
│  PostgreSQL      │  ← Database
└──────────────────┘
```

## Security Features

- ✅ Non-root user in containers
- ✅ Health checks
- ✅ Proper signal handling (dumb-init)
- ✅ Environment variable isolation
- ✅ Network isolation (Docker networks)
- ✅ Volume persistence for database
- ✅ Automatic migrations

## Production Recommendations

1. Use `docker-compose.prod.yml` for production
2. Set up SSL/TLS with Let's Encrypt
3. Configure firewall (UFW)
4. Set up automated backups
5. Monitor logs and resources
6. Use strong passwords and secrets
7. Restrict database port exposure
8. Set up log rotation

## Troubleshooting

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting steps.

Common issues:
- Port conflicts: Change PORT in .env
- Database connection: Check DATABASE_URL format
- Migration errors: Check database logs
- Container won't start: Check logs with `docker compose logs`

