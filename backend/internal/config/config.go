package config

import (
	"log/slog"
	"os"
	"strconv"
)

// Config holds runtime configuration, resolved from environment variables with
// sensible defaults. CLI flags (see cmd/serve.go) may override these values.
type Config struct {
	Host        string
	Port        int
	DatabaseURL string
	Env         string // "development" | "production"
	LogLevelStr string
}

// Load reads configuration from the environment, applying defaults.
func Load() *Config {
	return &Config{
		Host:        getenv("HOST", "0.0.0.0"),
		Port:        getenvInt("PORT", 8080),
		DatabaseURL: getenv("DATABASE_URL", ""),
		Env:         getenv("APP_ENV", "development"),
		LogLevelStr: getenv("LOG_LEVEL", "info"),
	}
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
