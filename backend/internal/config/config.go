package config

import (
	"log/slog"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds runtime configuration, resolved from environment variables (which
// are loaded from .env files, see Load) with sensible defaults. CLI flags (see
// cmd/serve.go) may override these values.
type Config struct {
	Host        string
	Port        int
	DatabaseURL string
	Env         string // "development" | "production"
	LogLevelStr string

	// StaticCacheMaxAge is the max-age (seconds) sent for embedded frontend
	// assets. The frontend is rebuilt often, so this is deliberately short
	// (default 1 hour) to keep browsers from holding stale files.
	StaticCacheMaxAge int

	// Keycloak (OIDC). The OIDC client_id is the module name (kentos.module.json
	// "name"), not configured here. RedirectURI is optional — when empty it is
	// derived per-request from the request's base URL + /auth/callback.
	KeycloakURL          string
	KeycloakRealm        string
	KeycloakClientSecret string
	KeycloakRedirectURI  string
}

// Load reads configuration from the environment, applying defaults. It first
// loads .env files so every variable can be configured from .env: the process
// environment always wins, then ./.env, then ../.env (so it works whether the
// binary runs from the repo root or from within backend/).
func Load() *Config {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	return &Config{
		Host:              getenv("HOST", "0.0.0.0"),
		Port:              getenvInt("PORT", 5800),
		DatabaseURL:       getenv("DATABASE_URL", ""),
		Env:               getenv("APP_ENV", "development"),
		LogLevelStr:       getenv("LOG_LEVEL", "info"),
		StaticCacheMaxAge: getenvInt("STATIC_CACHE_MAX_AGE", 3600),

		KeycloakURL:          getenv("KEYCLOAK_URL", "http://localhost:8080"),
		KeycloakRealm:        getenv("KEYCLOAK_REALM", "sivasbeltr"),
		KeycloakClientSecret: getenv("KEYCLOAK_CLIENT_SECRET", ""),
		KeycloakRedirectURI:  getenv("KEYCLOAK_REDIRECT_URI", ""),
	}
}

// Issuer returns the Keycloak realm issuer URL.
func (c *Config) Issuer() string {
	return c.KeycloakURL + "/realms/" + c.KeycloakRealm
}

// OIDCConfigURL returns the Keycloak OpenID discovery document URL.
func (c *Config) OIDCConfigURL() string {
	return c.Issuer() + "/.well-known/openid-configuration"
}

// IsProduction reports whether the app runs in production mode.
func (c *Config) IsProduction() bool { return c.Env == "production" }

// LogLevel maps the configured level string to a slog.Level.
func (c *Config) LogLevel() slog.Level {
	switch c.LogLevelStr {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func getenv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
