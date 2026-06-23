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

	"kentos-project-template/internal/auth"
	"kentos-project-template/internal/config"
	"kentos-project-template/internal/database"
	"kentos-project-template/internal/module"
)

// Server bundles the Fiber app with its dependencies.
type Server struct {
	cfg    *config.Config
	db     *database.DB
	assets fs.FS
	mod    *module.Module
	auth   *auth.Service
	app    *fiber.App
}

// New builds a configured Fiber app: middleware, the JSON API, and the embedded
// single-page frontend.
func New(cfg *config.Config, db *database.DB, assets fs.FS, mod *module.Module) *Server {
	app := fiber.New(fiber.Config{
		AppName: mod.DisplayName,
	})

	// The OIDC client_id is the module name (kentos.module.json "name").
	authSvc := auth.NewService(cfg.Issuer(), mod.Name, cfg.KeycloakClientSecret)

	s := &Server{cfg: cfg, db: db, assets: assets, mod: mod, auth: authSvc, app: app}

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

	// Keycloak login flow (backend-mediated, confidential client).
	authGroup := api.Group("/auth")
	authGroup.Get("/login", s.handleAuthLogin)
	authGroup.Post("/callback", s.handleAuthCallback)
	authGroup.Post("/refresh", s.handleAuthRefresh)
	authGroup.Post("/logout", s.handleAuthLogout)

	// Example protected route: any valid access token (no specific role) →
	// returns the verified caller. Protect future routes the same way, e.g.
	//   api.Get("/admin/...", s.RolesRequired("Admin"), handler)
	api.Get("/me", s.RolesRequired(), s.handleMe)

	// Each module serves its own manifest at /api/<apiVersion>/<name>/metadata.
	s.app.Get(s.mod.MetadataPath(), s.handleMetadata)
	slog.Info("module metadata endpoint registered", "path", s.mod.MetadataPath(), "module", s.mod.Name)
}
