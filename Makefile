.PHONY: help install dev build clean docker-up docker-down db-setup db-reset format lint test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

dev: ## Start development servers
	npm run dev

build: ## Build all packages
	npm run build

clean: ## Clean build artifacts and dependencies
	npm run clean
	rm -rf node_modules

docker-up: ## Start Docker services
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

db-setup: ## Setup database (generate, push, seed)
	npm run db:generate
	npm run db:push
	npm run db:seed

db-reset: ## Reset database
	npm run db:push -- --force-reset
	npm run db:seed

db-studio: ## Open Prisma Studio
	npm run db:studio

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

lint: ## Lint code
	npm run lint

type-check: ## Type check all packages
	npm run type-check

test: ## Run tests
	npm run test

setup: install docker-up db-setup ## Complete initial setup
	@echo "✅ Setup complete! Run 'make dev' to start development."
