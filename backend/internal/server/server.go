package server

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"

	"kentos-project-template/internal/config"
	"kentos-project-template/internal/database"
)

// Server bundles the Fiber app with its dependencies.
type Server struct {
	cfg    *config.Config
	db     *database.DB
	assets fs.FS
	app    *fiber.App
}

// New builds a configured Fiber app: middleware, the JSON API, and the embedded
// single-page frontend.
func New(cfg *config.Config, db *database.DB, assets fs.FS) *Server {
	app := fiber.New(fiber.Config{
		AppName: "KentOS Console",
	})

	s := &Server{cfg: cfg, db: db, assets: assets, app: app}

	app.Use(recoverer.New())
	app.Use(logger.New())
	app.Use(cors.New())

	s.registerAPI()
	s.registerStatic() // catch-all; must be registered last

	return s
}

// Run starts the HTTP listener and blocks until ctx is cancelled, at which point
// Fiber shuts down gracefully.
func (s *Server) Run(ctx context.Context) error {
	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	slog.Info("starting server", "addr", addr, "env", s.cfg.Env)

	// Listen blocks until GracefulContext is cancelled (SIGINT/SIGTERM), then
	// drains in-flight requests and returns.
	err := s.app.Listen(addr, fiber.ListenConfig{
		DisableStartupMessage: true,
		GracefulContext:       ctx,
	})
	slog.Info("server stopped")
	return err
}

// registerAPI mounts the JSON API under /api.
func (s *Server) registerAPI() {
	api := s.app.Group("/api")
	api.Get("/health", s.handleHealth)
}
