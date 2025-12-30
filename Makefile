.PHONY: help build up down restart logs clean migrate seed backup

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build Docker images
	docker compose build

up: ## Start containers
	docker compose up -d

down: ## Stop containers
	docker compose down

restart: ## Restart containers
	docker compose restart

logs: ## View logs
	docker compose logs -f

logs-backend: ## View backend logs
	docker compose logs -f backend

logs-db: ## View database logs
	docker compose logs -f postgres

migrate: ## Run database migrations
	docker compose exec backend npx prisma migrate deploy

seed: ## Seed database
	docker compose exec backend npm run prisma:seed

backup: ## Backup database
	@mkdir -p backups
	docker compose exec postgres pg_dump -U postgres retailer_comparison > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup saved to backups/"

clean: ## Remove containers and volumes (WARNING: deletes data!)
	docker compose down -v

ps: ## Show container status
	docker compose ps

shell-backend: ## Open shell in backend container
	docker compose exec backend sh

shell-db: ## Open PostgreSQL shell
	docker compose exec postgres psql -U postgres -d retailer_comparison

deploy: ## Deploy to production
	./deploy.sh production

test: ## Test health endpoint
	curl http://localhost:3000/health

