.PHONY: dev build test lint migrate-up migrate-down migrate-create migrate-status sqlc wire minio-init security-scan

# Start local dev stack (Docker services + hot-reload via air)
dev:
	docker-compose up -d && air

# Build the API binary
build:
	go build -o bin/api ./cmd/api

# Run all tests with race detector
test:
	go test -race ./...

# Run linter
lint:
	golangci-lint run ./...

# Apply all pending migrations
migrate-up:
	migrate -path db/migrations -database $$DATABASE_URL up

# Roll back the last migration
migrate-down:
	migrate -path db/migrations -database $$DATABASE_URL down 1

# Create a new migration file pair (usage: make migrate-create name=create_users)
migrate-create:
	migrate create -ext sql -dir db/migrations -seq $(name)

# Show current migration version
migrate-status:
	migrate -path db/migrations -database $$DATABASE_URL version

# Regenerate sqlc query code from SQL files
sqlc:
	sqlc generate

# Regenerate wire dependency injection code
wire:
	wire ./cmd/api/

# Initialize MinIO bucket for local dev (requires mc CLI)
minio-init:
	mc alias set local http://localhost:9000 ordo_minio ordo_minio_secret && mc mb local/ordo-uploads

# Run security scanners
security-scan:
	govulncheck ./... && gosec -quiet -conf .gosec.yaml ./...

# Run k6 load tests (requires k6 installed and BASE_URL set)
BASE_URL ?= http://localhost:8080
load-test:
	k6 run tests/load/auth.js -e BASE_URL=$(BASE_URL) && \
	k6 run tests/load/content_list.js -e BASE_URL=$(BASE_URL) && \
	k6 run tests/load/ai_chat.js -e BASE_URL=$(BASE_URL)

# Generate OpenAPI spec stub (full annotation requires swag init)
swagger:
	@echo "Run: swag init -g cmd/api/main.go -o docs/swagger"
