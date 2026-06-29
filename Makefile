# TurboHesap — root Makefile
# Single entry point for the pnpm monorepo: @turbohesap/shared (contracts),
# @turbohesap/frontend (React SPA), @turbohesap/backend (NestJS API) and
# @turbohesap/mobile (Expo). The frontend compiles into backend/static; the
# NestJS server serves that directory, so the web app runs from one process.

PNPM ?= pnpm
MODULE := turbohesap

# Load configuration from .env so every command sees the same variables
# (missing file is ignored). `export` forwards them to recipe subprocesses.
-include .env
export

# Local upload directory (mirrors the backend FILE_LOCAL_DIR; relative paths
# are resolved under backend/). Used by `make reset` to wipe uploaded files.
FILE_LOCAL_DIR ?= storage/uploads

.DEFAULT_GOAL := help

# ═══════════════════════════════════════════════════════════════════════════

##@ Setup
.PHONY: help
help: ## List available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\n  \033[1mTurboHesap\033[0m — make targets\n"} \
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
.PHONY: dev
dev: ## Run everything in watch mode: shared + NestJS API (:5800) + Vite (:5173, proxies /api)
	$(PNPM) dev

.PHONY: dev-frontend
dev-frontend: ## Start the Vite dev server with hot reload (:5173)
	$(PNPM) --filter @turbohesap/frontend dev

.PHONY: dev-backend
dev-backend: ## Run the NestJS API in watch mode (:5800)
	$(PNPM) --filter @turbohesap/backend start:dev

.PHONY: dev-shared
dev-shared: ## Recompile @turbohesap/shared on change (watch)
	$(PNPM) --filter @turbohesap/shared dev

.PHONY: dev-mobile
dev-mobile: ## Start the Expo dev server for the mobile app (Metro)
	$(PNPM) --filter @turbohesap/mobile start

.PHONY: mobile-ios
mobile-ios: ## Open the mobile app in the iOS simulator
	$(PNPM) --filter @turbohesap/mobile ios

.PHONY: mobile-android
mobile-android: ## Open the mobile app on Android
	$(PNPM) --filter @turbohesap/mobile android

# Android toolchain defaults for macOS — prefer a JDK 17 (Expo/RN's supported
# toolchain; Gradle 9 + JDK 21 trips the Foojay toolchain resolver), falling back
# to Android Studio's bundled JDK. Default SDK location is also assumed so
# `make mobile-android-release` works without exporting JAVA_HOME/ANDROID_HOME.
# Override either on the command line if needed.
JAVA_HOME ?= $(shell test -d /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
	&& echo /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
	|| echo "/Applications/Android Studio.app/Contents/jbr/Contents/Home")
ANDROID_HOME ?= $(HOME)/Library/Android/sdk

.PHONY: mobile-android-release
mobile-android-release: build-shared ## Build a RELEASE Android app and run it on a device/emulator (auto-prebuilds native android/)
	@test -x "$(JAVA_HOME)/bin/java" || (echo "JDK not found at JAVA_HOME=$(JAVA_HOME). Install Android Studio or set JAVA_HOME=<jdk17+ home>." && exit 1)
	JAVA_HOME="$(JAVA_HOME)" ANDROID_HOME="$(ANDROID_HOME)" PATH="$(ANDROID_HOME)/platform-tools:$(ANDROID_HOME)/emulator:$$PATH" \
		$(PNPM) --filter @turbohesap/mobile exec expo run:android --variant release

.PHONY: stop
stop: ## Stop running dev/server processes (API + Vite :5173)
	@for p in $(PORT) 5173; do \
		pids=$$(lsof -ti tcp:$$p 2>/dev/null); \
		if [ -n "$$pids" ]; then echo "stopping port $$p (pid $$pids)"; kill $$pids 2>/dev/null || true; \
		else echo "nothing listening on port $$p"; fi; \
	done

##@ Build
.PHONY: build-shared
build-shared: ## Compile @turbohesap/shared (contracts) to dist
	$(PNPM) --filter @turbohesap/shared build

.PHONY: build-frontend
build-frontend: build-shared ## Compile the SPA into backend/static
	$(PNPM) --filter @turbohesap/frontend build

.PHONY: build-backend
build-backend: build-shared ## Compile the NestJS server to backend/dist
	$(PNPM) --filter @turbohesap/backend build

.PHONY: build
build: build-shared build-frontend build-backend ## Build shared, frontend, then the NestJS backend
	@echo "Built TurboHesap — $(MODULE)"

##@ Run
.PHONY: run
run: build-frontend ## Build the frontend and run the NestJS backend serving it (:5800)
	$(PNPM) --filter @turbohesap/backend start

.PHONY: run-prod
run-prod: build ## Build everything and run the compiled server
	$(PNPM) --filter @turbohesap/backend start:prod

##@ Database
.PHONY: migrate
migrate: ## Apply pending TypeORM migrations
	$(PNPM) --filter @turbohesap/backend migration:run

.PHONY: migration-generate
migration-generate: ## Generate a migration from entity changes (NAME=AddThing)
	@test -n "$(NAME)" || (echo "usage: make migration-generate NAME=AddThing" && exit 1)
	$(PNPM) --filter @turbohesap/backend migration:generate src/migrations/$(NAME)

.PHONY: migration-revert
migration-revert: ## Revert the most recently applied migration
	$(PNPM) --filter @turbohesap/backend migration:revert

.PHONY: reset
reset: ## DANGER: wipe the database AND uploads — back to point zero (asks twice)
	@echo ""
	@echo "  \033[1;31m⚠  DIKKAT — GERI ALINAMAZ ISLEM\033[0m"
	@echo "  Bu komut '$(MODULE)' veritabanindaki TUM verileri siler ve yuklenen"
	@echo "  dosyalari (backend/$(FILE_LOCAL_DIR)) kaldirir. Program 0 noktasina doner."
	@echo "  Veritabani: \033[33m$(DATABASE_URL)\033[0m"
	@echo ""
	@printf "  1/2 — Devam etmek istediginizden emin misiniz? [evet/hayir]: "; \
	read a1; [ "$$a1" = "evet" ] || { echo "  Iptal edildi."; exit 1; }; \
	printf "  2/2 — TUM veriler KALICI olarak silinecek. Onaylamak icin 'SIFIRLA' yazin: "; \
	read a2; [ "$$a2" = "SIFIRLA" ] || { echo "  Iptal edildi."; exit 1; }; \
	echo ""; echo "  -> Veritabani semasi siliniyor…"; \
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;' \
	  || { echo "  psql basarisiz — Postgres calisiyor mu, DATABASE_URL dogru mu?"; exit 1; }; \
	case "$(FILE_LOCAL_DIR)" in /*) d="$(FILE_LOCAL_DIR)";; *) d="backend/$(FILE_LOCAL_DIR)";; esac; \
	echo "  -> Yuklenen dosyalar siliniyor ($$d)…"; rm -rf "$$d"; \
	echo ""; echo "  \033[1;32m✓ Sifirlandi.\033[0m Ilk acilista sema migrasyonla kurulur ve admin tohumlanir (make run / make dev)."

##@ Quality
.PHONY: lint
lint: ## Lint the frontend (eslint) and type-check the backend (tsc)
	$(PNPM) --filter @turbohesap/frontend lint
	$(PNPM) --filter @turbohesap/backend typecheck

.PHONY: mobile-typecheck
mobile-typecheck: build-shared ## Type-check the mobile app (tsc --noEmit)
	$(PNPM) --filter @turbohesap/mobile typecheck

.PHONY: test
test: ## Backend unit tests (jest)
	$(PNPM) --filter @turbohesap/backend test

.PHONY: test-e2e
test-e2e: ## Backend e2e tests (boots the app; needs Postgres, uses turbohesap_test)
	$(PNPM) --filter @turbohesap/backend test:e2e

.PHONY: clean
clean: ## Remove build artifacts (dist + generated frontend assets)
	rm -rf shared/dist backend/dist
	rm -rf backend/static/assets
	$(PNPM) --filter @turbohesap/frontend exec rm -rf dist 2>/dev/null || true
