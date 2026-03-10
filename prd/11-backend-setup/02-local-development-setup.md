# Local Development Setup Guide — Ordo Creator OS Backend

> Get from zero to running the full Ordo API stack in under 10 minutes.

**Last Updated:** 2026-03-10
**Go Version:** 1.22+
**Framework:** Chi Router + PostgreSQL + Redis + MinIO

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start](#2-quick-start)
3. [Docker Compose Setup](#3-docker-compose-setup)
4. [Environment Configuration](#4-environment-configuration)
5. [Database Migrations](#5-database-migrations)
6. [Seed Data](#6-seed-data)
7. [Development Workflow](#7-development-workflow)
8. [Useful Development URLs](#8-useful-development-urls)
9. [Troubleshooting](#9-troubleshooting)
10. [Next Steps](#10-next-steps)

---

## 1. Prerequisites

Ensure you have all required tools installed:

### 1.1 Core Requirements

- **Go 1.22+** — [Download](https://golang.org/dl)
  ```bash
  go version  # Should output go version 1.22.x or higher
  ```

- **Docker Desktop** (includes Docker Compose v2) — [Download](https://www.docker.com/products/docker-desktop)
  ```bash
  docker --version
  docker compose version  # Should be v2.20+
  ```

- **Make** — Usually pre-installed on macOS/Linux
  ```bash
  make --version
  ```
  On Windows, install via [chocolatey](https://chocolatey.org/packages/make) or use WSL2

### 1.2 Development Tools

These tools are referenced in the Makefile and should be installed:

- **sqlc** — Type-safe SQL code generator
  ```bash
  go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
  ```

- **golang-migrate** — Database migration tool
  ```bash
  go install -tags 'postgres' github.com/migrate/migrate/v4/cmd/migrate@latest
  ```

- **golangci-lint** — Go linter aggregator
  ```bash
  go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
  ```

- **air** (optional) — Hot reload for Go development
  ```bash
  go install github.com/cosmtrek/air@latest
  ```

- **Node.js 20+** (optional) — For frontend development or API documentation tools
  ```bash
  node --version
  ```

### 1.3 Verification

Run this command to verify all prerequisites:

```bash
go version && docker --version && make --version && sqlc --version && migrate --version
```

---

## 2. Quick Start

Get the API running in 5 steps:

```bash
# 1. Clone the repository
git clone https://github.com/ordo/ordo-api.git
cd ordo-api

# 2. Copy environment template
cp .env.example .env

# 3. Start all services (PostgreSQL, Redis, MinIO, MailHog)
make docker-up

# 4. Run migrations and seed data
make migrate-up
make seed

# 5. Start the API server
make run
```

The API will be running at **http://localhost:8080**. Verify with:

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-10T10:00:00Z",
  "version": "1.0.0"
}
```

---

## 3. Docker Compose Setup

### 3.1 docker-compose.yml

Create or update `docker-compose.yml` in your project root:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: ordo_postgres
    environment:
      POSTGRES_USER: ordo
      POSTGRES_PASSWORD: ordo_dev_password
      POSTGRES_DB: ordo_dev
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ordo -d ordo_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - ordo_network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: ordo_redis
    command: redis-server --appendonly yes --appendfsync everysec
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - ordo_network
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    container_name: ordo_minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"      # API endpoint
      - "9001:9001"      # Console UI
    volumes:
      - minio_data:/minio_data
    command: minio server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - ordo_network
    restart: unless-stopped

  mailhog:
    image: mailhog/mailhog:latest
    container_name: ordo_mailhog
    ports:
      - "1025:1025"      # SMTP port
      - "8025:8025"      # Web UI
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8025"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ordo_network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local

networks:
  ordo_network:
    driver: bridge
```

### 3.2 Starting Services

```bash
# Start all services in background
make docker-up

# Or manually with docker compose
docker compose up -d

# View logs
docker compose logs -f

# Check service status
docker compose ps

# Stop all services
make docker-down
```

### 3.3 Verifying Services

```bash
# PostgreSQL (should return "accepting connections")
docker exec ordo_postgres pg_isready -U ordo

# Redis (should return "PONG")
docker exec ordo_redis redis-cli ping

# MinIO (should return 200)
curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live

# MailHog (should return 200)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8025
```

---

## 4. Environment Configuration

### 4.1 .env.example Template

Copy this to `.env` in your project root and adjust as needed:

```bash
# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================

# Server Configuration
APP_ENV=development
APP_PORT=8080
APP_HOST=0.0.0.0
APP_DEBUG=true
APP_NAME=Ordo Creator OS
APP_VERSION=1.0.0

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_USER=ordo
DB_PASSWORD=ordo_dev_password
DB_NAME=ordo_dev
DB_SSLMODE=disable

# Connection Pool Settings
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME=5m

# Migration Settings
MIGRATE_DIR=./migrations
MIGRATE_DRIVER=postgres

# ============================================================================
# REDIS CONFIGURATION
# ============================================================================

# Redis Cache & Queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_MAX_RETRIES=3
REDIS_POOL_SIZE=10

# ============================================================================
# JWT AUTHENTICATION
# ============================================================================

# Secret Keys (change in production!)
JWT_ACCESS_SECRET=dev-access-secret-change-in-production-12345678
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production-12345678

# Token Expiry
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_ISSUER=ordo-creator-os
JWT_AUDIENCE=ordo-clients

# ============================================================================
# OBJECT STORAGE (MinIO/S3)
# ============================================================================

# MinIO Configuration (development)
STORAGE_TYPE=minio
STORAGE_ENDPOINT=localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=ordo-uploads
STORAGE_USE_SSL=false
STORAGE_REGION=us-east-1

# S3 Configuration (production)
# STORAGE_TYPE=s3
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_REGION=us-east-1

# ============================================================================
# AI PROVIDERS
# ============================================================================

# Anthropic (Claude)
ANTHROPIC_API_KEY=

# OpenAI
OPENAI_API_KEY=

# Model Configuration
DEFAULT_AI_PROVIDER=anthropic
AI_REQUEST_TIMEOUT=30s
AI_MAX_RETRIES=3

# ============================================================================
# OAUTH INTEGRATIONS
# ============================================================================

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8080/v1/auth/oauth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URL=http://localhost:8080/v1/auth/oauth/github/callback

# ============================================================================
# STRIPE BILLING
# ============================================================================

# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_
STRIPE_PUBLISHABLE_KEY=pk_test_
STRIPE_WEBHOOK_SECRET=whsec_

# Product IDs
STRIPE_PRO_PRICE_ID=price_
STRIPE_ENTERPRISE_PRICE_ID=price_

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================

# SMTP Settings (MailHog for development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=noreply@ordocreator.com
SMTP_FROM_NAME=Ordo Creator OS

# Email Templates
EMAIL_TEMPLATE_DIR=./templates/emails

# ============================================================================
# RATE LIMITING
# ============================================================================

# Requests per hour (by subscription tier)
RATE_LIMIT_FREE=100
RATE_LIMIT_PRO=500
RATE_LIMIT_ENTERPRISE=2000
RATE_LIMIT_ANONYMOUS=20

# Rate limit storage
RATE_LIMIT_STORE=redis

# ============================================================================
# LOGGING
# ============================================================================

# Log Level (debug, info, warn, error)
LOG_LEVEL=debug
LOG_FORMAT=console
LOG_OUTPUT=stdout

# Structured Logging (JSON)
LOG_JSON=false

# ============================================================================
# CORS & SECURITY
# ============================================================================

# Allowed Origins
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,http://localhost:5173
CORS_ALLOWED_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Request-ID,X-Workspace-ID
CORS_EXPOSE_HEADERS=Content-Length,X-Request-ID
CORS_MAX_AGE=3600
CORS_ALLOW_CREDENTIALS=true

# HTTPS (development: false)
SECURE_HTTPS_ONLY=false
SECURE_COOKIE_SECURE=false
SECURE_COOKIE_HTTPONLY=true
SECURE_COOKIE_SAMESITE=Lax

# ============================================================================
# FEATURE FLAGS
# ============================================================================

FEATURE_AI_GENERATION=true
FEATURE_REMIX=true
FEATURE_ANALYTICS=true
FEATURE_SPONSORSHIPS=true
FEATURE_INTEGRATIONS=true
FEATURE_WEBHOOKS=true
FEATURE_WEBSOCKETS=true

# ============================================================================
# EXTERNAL SERVICES
# ============================================================================

# Analytics
ANALYTICS_ENABLED=true
ANALYTICS_PROVIDER=mixpanel

# Error Tracking
SENTRY_DSN=

# Tracing
OTEL_ENABLED=false
OTEL_JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

### 4.2 Loading Configuration

The application uses `envconfig` to load environment variables. Variables are loaded in this order:

1. `.env` file (if present)
2. Environment variables
3. Default values in code

**Never commit `.env` to git.** Use `.env.example` as the template.

---

## 5. Database Migrations

### 5.1 Migration Location

Database migrations are located in `./migrations/` directory:

```
migrations/
├── 000001_create_users.up.sql
├── 000001_create_users.down.sql
├── 000002_create_workspaces.up.sql
├── 000002_create_workspaces.down.sql
├── ...
└── MIGRATIONS_STATUS
```

### 5.2 Running Migrations

```bash
# Apply all pending migrations (up to latest version)
make migrate-up

# Or manually:
migrate -path ./migrations -database "postgresql://ordo:ordo_dev_password@localhost:5432/ordo_dev?sslmode=disable" up

# Check migration status
migrate -path ./migrations -database "postgresql://ordo:ordo_dev_password@localhost:5432/ordo_dev?sslmode=disable" version

# Rollback last migration
make migrate-down

# Force specific version (use with caution)
migrate -path ./migrations -database "postgresql://ordo:ordo_dev_password@localhost:5432/ordo_dev?sslmode=disable" force 5
```

### 5.3 Creating New Migrations

When adding new database features:

```bash
# Create migration files (replace FEATURE_NAME with actual feature)
migrate create -ext sql -dir migrations -seq create_FEATURE_NAME

# Files created:
# migrations/000XXX_create_FEATURE_NAME.up.sql
# migrations/000XXX_create_FEATURE_NAME.down.sql
```

Edit the `.up.sql` and `.down.sql` files with your schema changes, then:

```bash
# Test the migration
make migrate-up

# If something went wrong, rollback
make migrate-down

# Regenerate sqlc code if you modified queries
make sqlc-generate
```

### 5.4 Database Schema Generation (sqlc)

After migrations, regenerate type-safe query code:

```bash
# Generate Go code from SQL queries
make sqlc-generate

# Or manually:
sqlc generate
```

This creates Go types and methods in `internal/repository/postgres/gen/` based on `internal/repository/postgres/queries/`.

---

## 6. Seed Data

### 6.1 Seeding Development Database

```bash
# Create all seed data in one command
make seed

# Or run seeding script directly
go run cmd/seed/main.go
```

### 6.2 What Gets Seeded

The seed data creates a realistic development environment:

#### Users (3 test accounts)
- **Admin User**
  - Email: `admin@ordocreator.com`
  - Password: `password123`
  - Role: Admin
  - Free tier

- **Pro User**
  - Email: `creator@ordocreator.com`
  - Password: `password123`
  - Role: Creator
  - Pro subscription (active)

- **Free User**
  - Email: `free@ordocreator.com`
  - Password: `password123`
  - Role: Creator
  - Free tier

#### Workspaces (2 total)
- **Personal Workspace** (owned by creator@ordocreator.com)
  - Name: "My Content Studio"
  - Member count: 1
  - Storage limit: 5GB

- **Team Workspace** (owned by admin@ordocreator.com)
  - Name: "Team Collaboration"
  - Members: 2 (admin + creator)
  - Storage limit: 50GB

#### Content Ideas (10 total)
- Mix of statuses: brainstorm, research, writing, published
- Various topics: productivity, technology, entertainment
- Associated with different workspaces

#### Pipeline Contents (5 total)
- Across all lifecycle statuses: draft, in_production, queued, published, archived
- Mix of formats: article, video, podcast, social_post
- With version history

#### Series (1 with 3 episodes)
- Name: "Creator's Toolkit"
- Episodes with publish schedules
- Associated platforms: YouTube, Podcast

#### Analytics Data
- 30 days of sample metrics
- View counts, engagement rates, traffic sources
- Content performance data

#### AI Conversations
- Sample interactions with different AI models
- Used for testing transcription and generation endpoints

### 6.3 Resetting Seed Data

If you need to reset to a clean state:

```bash
# 1. Drop all tables (careful!)
make db-drop

# 2. Recreate schema from migrations
make migrate-up

# 3. Seed again
make seed
```

Or use the seed script with a reset flag:
```bash
go run cmd/seed/main.go -reset
```

---

## 7. Development Workflow

### 7.1 Starting Development

**Terminal 1: Run API with hot reload**
```bash
# Install air (Go hot reload) if not already installed
go install github.com/cosmtrek/air@latest

# Run with hot reload (automatically restarts on code changes)
make dev

# Or manually with air
air
```

**Terminal 2: Watch database changes**
```bash
# Create migration
migrate create -ext sql -dir migrations -seq feature_name

# After editing .up.sql and .down.sql:
make migrate-up
make sqlc-generate
```

**Terminal 3: Run tests**
```bash
# Watch tests (if using a test runner)
make test-watch

# Or single test run
make test
```

### 7.2 Typical Development Flow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/user-preferences
   ```

2. **Create database migration** (if needed)
   ```bash
   migrate create -ext sql -dir migrations -seq add_user_preferences
   # Edit migrations/000XXX_add_user_preferences.up.sql
   # Edit migrations/000XXX_add_user_preferences.down.sql
   make migrate-up
   ```

3. **Define SQL queries** in `internal/repository/postgres/queries/`
   ```bash
   # Add queries to users.sql
   # See existing examples for pattern
   ```

4. **Generate sqlc code**
   ```bash
   make sqlc-generate
   ```

5. **Write domain logic** in `internal/domain/`
   ```bash
   # Define types, interfaces, validation
   ```

6. **Implement repository** in `internal/repository/postgres/`
   ```bash
   # Use generated sqlc code to implement repository interface
   ```

7. **Write service layer** in `internal/service/`
   ```bash
   # Business logic, orchestration between repositories
   ```

8. **Create HTTP handler** in `internal/handler/`
   ```bash
   # Parse request, call service, return response
   ```

9. **Register route** in `internal/server/routes.go`
   ```bash
   # Add route to router
   ```

10. **Test the endpoint**
    ```bash
    curl -X GET http://localhost:8080/api/endpoint
    ```

11. **Write tests** in `internal/*/handler_test.go`, etc.
    ```bash
    make test
    ```

12. **Lint and format**
    ```bash
    make lint
    make fmt
    ```

13. **Commit and push**
    ```bash
    git add .
    git commit -m "feat: add user preferences endpoint"
    git push origin feature/user-preferences
    ```

### 7.3 Code Organization Rules

- **Domain models** (`internal/domain/`) — Pure Go, no database dependencies
- **Repositories** (`internal/repository/`) — Data access, returns domain models
- **Services** (`internal/service/`) — Business logic, orchestrates repos and domain
- **Handlers** (`internal/handler/`) — HTTP parsing and response formatting only
- **Middleware** (`internal/middleware/`) — Cross-cutting concerns (auth, logging, etc.)
- **Config** (`internal/config/`) — Environment loading and validation
- **Server** (`internal/server/`) — HTTP server setup and routing

### 7.4 Testing

```bash
# Run all tests
make test

# Run specific test file
go test ./internal/handler/... -v

# Run with coverage
make test-coverage

# View coverage report
open coverage.html

# Test a specific package
go test -v ./internal/service/user

# Run tests matching a pattern
go test -v ./... -run TestUserCreate
```

### 7.5 Linting and Formatting

```bash
# Format code
make fmt

# Run linter
make lint

# Fix common issues
golangci-lint run ./... --fix

# Check before committing
make lint test
```

---

## 8. Useful Development URLs

### API Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| **API Health** | http://localhost:8080/health | Liveness & readiness check |
| **API Root** | http://localhost:8080 | API base (health redirect) |
| **API Docs** | http://localhost:8080/docs | OpenAPI/Swagger (if enabled) |

### Database Tools

| Service | URL/Connection | Credentials |
|---------|---|---|
| **PostgreSQL** | localhost:5432 | User: `ordo` / Password: `ordo_dev_password` / DB: `ordo_dev` |
| **Redis CLI** | localhost:6379 | `redis-cli` |
| **Redis Monitor** | `redis-cli MONITOR` | Real-time command monitor |

### MinIO Console

| Service | URL | Credentials |
|---------|-----|---|
| **MinIO Console** | http://localhost:9001 | User: `minioadmin` / Password: `minioadmin` |
| **MinIO API** | http://localhost:9000 | Same credentials |
| **Bucket** | `ordo-uploads` | Auto-created in docker-compose |

### MailHog

| Service | URL | Purpose |
|---------|-----|---------|
| **MailHog Web** | http://localhost:8025 | Email inbox viewer |
| **SMTP Server** | localhost:1025 | For app to send emails |

### Quick Connection Tests

```bash
# PostgreSQL
psql -h localhost -U ordo -d ordo_dev

# Redis
redis-cli -h localhost ping

# MinIO (using mc alias)
mc alias set local http://localhost:9000 minioadmin minioadmin
mc ls local/ordo-uploads

# MailHog API
curl http://localhost:8025/api/v1/messages
```

---

## 9. Troubleshooting

### 9.1 Port Conflicts

**Problem:** `Port 5432 is already in use`

**Solution:**
```bash
# Find what's using the port
lsof -i :5432

# Kill the process (macOS/Linux)
kill -9 <PID>

# Or use different port in docker-compose.yml
# Change "5432:5432" to "5433:5432" then update .env
```

### 9.2 Docker Memory Issues

**Problem:** `Docker container exits or crashes with memory errors`

**Solution:**
1. Increase Docker Desktop memory allocation:
   - Docker Desktop > Preferences > Resources > Memory (set to 4GB+)
2. Or reduce services:
   ```bash
   # Only start essentials
   docker compose up postgres redis -d
   ```

### 9.3 Migration Failures

**Problem:** `Migrate failed: migration lock`

**Solution:**
```bash
# Force unlock (use with caution)
migrate -path ./migrations -database "postgresql://ordo:ordo_dev_password@localhost:5432/ordo_dev?sslmode=disable" force 5

# Then try again
make migrate-up
```

**Problem:** `Migration failed: dirty database`

**Solution:**
```bash
# Check current version
migrate -path ./migrations -database "postgresql://ordo:ordo_dev_password@localhost:5432/ordo_dev?sslmode=disable" version

# Reset to clean state
make db-drop
make migrate-up
```

### 9.4 Connection Refused

**Problem:** `API cannot connect to PostgreSQL/Redis`

**Solution:**
```bash
# Verify services are running
docker compose ps

# Check service logs
docker compose logs postgres
docker compose logs redis

# Restart services
docker compose down
docker compose up -d

# Test connection
docker exec ordo_postgres pg_isready -U ordo
docker exec ordo_redis redis-cli ping
```

### 9.5 sqlc Generation Errors

**Problem:** `sqlc: error validating SQL`

**Solution:**
```bash
# Check SQL syntax in queries/
# Ensure SQL uses proper PostgreSQL syntax

# View detailed error
sqlc generate -v

# Common issues:
# - Missing FROM clause
# - Type mismatch in RETURNING
# - Invalid parameter names (use $1, $2, etc.)
```

### 9.6 Hot Reload (air) Not Working

**Problem:** Code changes don't trigger restart

**Solution:**
```bash
# Kill air process
pkill air

# Verify air is installed
air --version

# Restart with verbose logging
air -v

# Check .air.toml config file
# Ensure include_dirs and include_extensions are correct
```

### 9.7 Authentication Issues in Development

**Problem:** JWT tokens invalid or expired

**Solution:**
```bash
# Tokens are short-lived in development (15m for access token)
# Get new token:
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@ordocreator.com","password":"password123"}'

# Response includes access_token and refresh_token
# Use access_token in Authorization header:
curl -H "Authorization: Bearer <access_token>" http://localhost:8080/v1/users/me
```

### 9.8 MinIO Connection Errors

**Problem:** `Failed to connect to MinIO`

**Solution:**
```bash
# Verify MinIO is running
docker compose logs minio

# Check endpoint in .env
# For localhost development: STORAGE_ENDPOINT=localhost:9000

# Test connection
curl -v http://localhost:9000/minio/health/live

# Create default bucket if missing:
docker exec ordo_minio mc mb --make-bucket-if-not-exists local/ordo-uploads
```

### 9.9 Seed Data Issues

**Problem:** `make seed` fails

**Solution:**
```bash
# Ensure migrations ran first
make migrate-up

# Check seed script for errors
go run cmd/seed/main.go -v

# Clear and reseed
make db-drop
make migrate-up
make seed
```

### 9.10 Database Disk Space

**Problem:** Docker volumes consuming too much space

**Solution:**
```bash
# Check volume sizes
docker volume ls
docker volume inspect ordo_postgres_data | grep Mountpoint

# Clean up old data
docker system prune -a --volumes

# Or reset completely
docker compose down -v
docker compose up -d
make migrate-up
```

---

## 10. Next Steps

### 10.1 After Initial Setup

1. **Read the API Documentation**
   - Check `./docs/` directory
   - Review endpoint examples in `tests/postman/`

2. **Understand the Codebase**
   - Read `/prd/11-backend-setup/01-go-project-structure.md`
   - Follow a feature end-to-end (e.g., user creation)

3. **Set Up IDE/Editor**
   - VS Code: Install Go extension
   - GoLand/IntelliJ: Built-in Go support
   - Enable format on save, linting

4. **Configure Pre-commit Hooks** (optional)
   ```bash
   cp scripts/pre-commit.sh .git/hooks/pre-commit
   chmod +x .git/hooks/pre-commit
   ```

5. **Review Security Practices**
   - Never commit `.env` with real secrets
   - Use different keys for production
   - Follow OWASP guidelines

### 10.2 Common Development Tasks

**Adding a new API endpoint:**
```bash
# 1. Define domain model (if new entity)
# 2. Create SQL migration
# 3. Write queries in queries/ directory
# 4. Generate sqlc code
# 5. Implement repository
# 6. Write service logic
# 7. Create handler
# 8. Register route in routes.go
# 9. Test with curl or Postman
```

**Adding a background job:**
```bash
# 1. Define job type in domain/
# 2. Create job handler in internal/job/
# 3. Register with job processor
# 4. Enqueue from service layer
# 5. Monitor in Redis
```

**Adding a new middleware:**
```bash
# 1. Implement in internal/middleware/
# 2. Register in server/middleware.go
# 3. Apply to specific routes or globally
# 4. Test with curl headers
```

### 10.3 Helpful Resources

- **Go Best Practices:** https://golang.org/doc/effective_go
- **Chi Router Docs:** https://github.com/go-chi/chi
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Redis Commands:** https://redis.io/commands/
- **JWT Handbook:** https://auth0.com/resources/ebooks/jwt-handbook
- **Ordo Architecture:** See `/prd/06-architecture/`

---

## Quick Reference: Common Make Commands

```bash
# Docker & Services
make docker-up           # Start all services
make docker-down         # Stop all services
make docker-logs         # View service logs

# Database
make migrate-up          # Run migrations
make migrate-down        # Rollback one migration
make db-drop             # Drop all tables (careful!)
make seed                # Seed development data

# Development
make run                 # Start API server
make dev                 # Start with hot reload (air)
make test                # Run all tests
make test-coverage       # Generate coverage report
make lint                # Run linter
make fmt                 # Format code

# Code Generation
make sqlc-generate       # Generate sqlc code from queries
make wire-generate       # Generate dependency injection code

# Help
make help                # Show all available commands
```

---

**Happy coding! 🚀**

For issues or questions, check the Troubleshooting section or consult the team documentation.
