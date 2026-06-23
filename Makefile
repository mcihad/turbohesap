# KentOS Console — root Makefile
# Single entry point for building and running the frontend + Go backend.
# The frontend compiles into backend/static; the Go binary embeds that
# directory (go:embed), so `make build` yields one self-contained binary.

FRONTEND_DIR := frontend
BACKEND_DIR  := backend
BIN_DIR      := bin
BINARY       := $(BIN_DIR)/kentos

# Module path is derived from go.mod so renaming the module (see the
# init-module skill) is picked up automatically.
MODULE := $(shell cd $(BACKEND_DIR) && $(GO) list -m 2>/dev/null || echo kentos-project-template)

PNPM ?= pnpm
GO   ?= go

# Load configuration from .env so every command sees the same variables
# (missing file is ignored). `export` forwards them to recipe subprocesses.
-include .env
export

# Version is stamped into the binary (see cmd/version.go).
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS := -X $(MODULE)/cmd.Version=$(VERSION)

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
install: ## Install frontend dependencies (pnpm)
	cd $(FRONTEND_DIR) && $(PNPM) install

##@ Develop
.PHONY: dev-frontend
dev-frontend: ## Start the Vite dev server with hot reload (:5173)
	cd $(FRONTEND_DIR) && $(PNPM) dev

.PHONY: dev-backend
dev-backend: ## Run the Go API server without rebuilding the embed (:5800)
	cd $(BACKEND_DIR) && $(GO) run . serve

##@ Build
.PHONY: build-frontend
build-frontend: ## Compile the SPA into backend/static
	cd $(FRONTEND_DIR) && $(PNPM) build

.PHONY: build-backend
build-backend: ## Compile the Go binary, embedding backend/static
	mkdir -p $(BIN_DIR)
	cd $(BACKEND_DIR) && $(GO) build -ldflags "$(LDFLAGS)" -o ../$(BINARY) .

.PHONY: build
build: build-frontend build-backend ## Build the frontend then the single self-contained binary
	@echo "Built $(BINARY) ($(VERSION)) — module: $(MODULE)"

##@ Run
.PHONY: run
run: build-frontend ## Build the frontend and run the backend serving it (:5800)
	cd $(BACKEND_DIR) && $(GO) run -ldflags "$(LDFLAGS)" . serve

.PHONY: run-bin
run-bin: build ## Build everything and run the compiled binary
	./$(BINARY) serve

##@ Quality
.PHONY: tidy
tidy: ## Tidy Go module dependencies
	cd $(BACKEND_DIR) && $(GO) mod tidy

.PHONY: fmt
fmt: ## Format Go source
	cd $(BACKEND_DIR) && $(GO) fmt ./...

.PHONY: lint
lint: ## Lint the frontend (eslint) and vet the backend (go vet)
	cd $(FRONTEND_DIR) && $(PNPM) lint
	cd $(BACKEND_DIR) && $(GO) vet ./...

.PHONY: test
test: ## Run backend tests
	cd $(BACKEND_DIR) && $(GO) test ./...

.PHONY: clean
clean: ## Remove build artifacts (binary + generated frontend assets)
	rm -rf $(BIN_DIR)
	rm -rf $(BACKEND_DIR)/static/assets
	cd $(FRONTEND_DIR) && rm -rf dist
