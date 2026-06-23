# KentOS Console — root Makefile
# Single entry point for building and running the frontend + Go backend.
# The frontend compiles into backend/static; the Go binary embeds that
# directory (go:embed), so `make build` yields one self-contained binary.

FRONTEND_DIR := frontend
BACKEND_DIR  := backend
BIN_DIR      := bin
BINARY       := $(BIN_DIR)/kentos
MODULE       := kentos-project-template

PNPM ?= pnpm
GO   ?= go

# Version is stamped into the binary (see cmd/version.go).
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS := -X $(MODULE)/cmd.Version=$(VERSION)

.DEFAULT_GOAL := help

## help: list available targets
.PHONY: help
help:
	@echo "KentOS Console — make targets:"
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /'

## install: install frontend dependencies (pnpm)
.PHONY: install
install:
	cd $(FRONTEND_DIR) && $(PNPM) install

## dev-frontend: start the Vite dev server with hot reload (:5173)
.PHONY: dev-frontend
dev-frontend:
	cd $(FRONTEND_DIR) && $(PNPM) dev

## dev-backend: run the Go API server without rebuilding the embed (:8080)
.PHONY: dev-backend
dev-backend:
	cd $(BACKEND_DIR) && $(GO) run . serve

## build-frontend: compile the SPA into backend/static
.PHONY: build-frontend
build-frontend:
	cd $(FRONTEND_DIR) && $(PNPM) build

## build-backend: compile the Go binary, embedding backend/static
.PHONY: build-backend
build-backend:
	mkdir -p $(BIN_DIR)
	cd $(BACKEND_DIR) && $(GO) build -ldflags "$(LDFLAGS)" -o ../$(BINARY) .

## build: build the frontend then the single self-contained binary
.PHONY: build
build: build-frontend build-backend
	@echo "Built $(BINARY) ($(VERSION))"

## run: build the frontend and run the backend serving it (full app, :8080)
.PHONY: run
run: build-frontend
	cd $(BACKEND_DIR) && $(GO) run -ldflags "$(LDFLAGS)" . serve

## run-bin: build everything and run the compiled binary
.PHONY: run-bin
run-bin: build
	./$(BINARY) serve

## tidy: tidy Go module dependencies
.PHONY: tidy
tidy:
	cd $(BACKEND_DIR) && $(GO) mod tidy

## fmt: format Go source
.PHONY: fmt
fmt:
	cd $(BACKEND_DIR) && $(GO) fmt ./...

## lint: lint the frontend (eslint) and vet the backend (go vet)
.PHONY: lint
lint:
	cd $(FRONTEND_DIR) && $(PNPM) lint
	cd $(BACKEND_DIR) && $(GO) vet ./...

## test: run backend tests
.PHONY: test
test:
	cd $(BACKEND_DIR) && $(GO) test ./...

## clean: remove build artifacts (binary + generated frontend assets)
.PHONY: clean
clean:
	rm -rf $(BIN_DIR)
	rm -rf $(BACKEND_DIR)/static/assets
	cd $(FRONTEND_DIR) && rm -rf dist
