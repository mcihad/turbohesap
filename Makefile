# KentOS Console — root Makefile
# Single entry point for the pnpm monorepo: @kentos/shared (contracts),
# @kentos/frontend (React SPA) and @kentos/backend (NestJS API). The frontend
# compiles into backend/static; the NestJS server serves that directory, so the
# whole app runs from a single backend process.

PNPM ?= pnpm

# Module name is read from the manifest (single source of truth). Renaming the
# module (see the init-module skill) is picked up automatically.
MODULE := $(shell node -e "process.stdout.write(require('./backend/kentos.module.json').name)" 2>/dev/null || echo kentos-project-template)

# Load configuration from .env so every command sees the same variables
# (missing file is ignored). `export` forwards them to recipe subprocesses.
-include .env
export

.DEFAULT_GOAL := help

# ═══════════════════════════════════════════════════════════════════════════

##@ Setup
.PHONY: help
help: ## List available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\n  \033[1mKentOS Console\033[0m — make targets\n"} \
		/^##@/ {printf "\n  \033[1m%s\033[0m\n", substr($$0, 5)} \
		/^[a-zA-Z0-9_.-]+:.*##/ {printf "    \033[36m%-16s\033[0m %s\n", $$1, $$2} \
		END {printf "\n"}' $(MAKEFILE_LIST)

.PHONY: env
env: ## Create .env from .env.example if it does not exist
	@test -f .env && echo ".env already exists" || (cp .env.example .env && echo "created .env from .env.example")

.PHONY: install
install: ## Install all workspace dependencies (pnpm)
	$(PNPM) install

##@ Develop
.PHONY: dev-frontend
dev-frontend: ## Start the Vite dev server with hot reload (:5173)
	$(PNPM) --filter @kentos/frontend dev

.PHONY: dev-backend
dev-backend: ## Run the NestJS API in watch mode (:5800)
	$(PNPM) --filter @kentos/backend start:dev

.PHONY: dev-shared
dev-shared: ## Recompile @kentos/shared on change (watch)
	$(PNPM) --filter @kentos/shared dev

##@ Build
.PHONY: build-shared
build-shared: ## Compile @kentos/shared (contracts) to dist
	$(PNPM) --filter @kentos/shared build

.PHONY: build-frontend
build-frontend: build-shared ## Compile the SPA into backend/static
	$(PNPM) --filter @kentos/frontend build

.PHONY: build-backend
build-backend: build-shared ## Compile the NestJS server to backend/dist
	$(PNPM) --filter @kentos/backend build

.PHONY: build
build: build-shared build-frontend build-backend ## Build shared, frontend, then the NestJS backend
	@echo "Built KentOS Console — module: $(MODULE)"

##@ Run
.PHONY: run
run: build-frontend ## Build the frontend and run the NestJS backend serving it (:5800)
	$(PNPM) --filter @kentos/backend start

.PHONY: run-prod
run-prod: build ## Build everything and run the compiled server
	$(PNPM) --filter @kentos/backend start:prod

##@ Quality
.PHONY: lint
lint: ## Lint the frontend (eslint) and type-check the backend (tsc)
	$(PNPM) --filter @kentos/frontend lint
	$(PNPM) --filter @kentos/backend typecheck

.PHONY: clean
clean: ## Remove build artifacts (dist + generated frontend assets)
	rm -rf shared/dist backend/dist
	rm -rf backend/static/assets
	$(PNPM) --filter @kentos/frontend exec rm -rf dist 2>/dev/null || true
