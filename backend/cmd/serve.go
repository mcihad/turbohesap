package cmd

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"

	"kentos-project-template/internal/config"
	"kentos-project-template/internal/database"
	"kentos-project-template/internal/server"
)

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the HTTP server",
	Long:  "Start the Fiber HTTP server: serves the embedded frontend and the JSON API.",
	RunE:  runServe,
}

func init() {
	rootCmd.AddCommand(serveCmd)

	// Flags override environment variables; environment overrides defaults.
	serveCmd.Flags().String("host", "", "host/interface to bind (env: HOST)")
	serveCmd.Flags().Int("port", 0, "port to listen on (env: PORT)")
	serveCmd.Flags().String("database-url", "", "PostgreSQL connection string (env: DATABASE_URL)")
}

func runServe(cmd *cobra.Command, _ []string) error {
	cfg := config.Load()

	if v, _ := cmd.Flags().GetString("host"); v != "" {
		cfg.Host = v
	}
	if v, _ := cmd.Flags().GetInt("port"); v != 0 {
		cfg.Port = v
	}
	if v, _ := cmd.Flags().GetString("database-url"); v != "" {
		cfg.DatabaseURL = v
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel()}))
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Database is optional: the server still boots (and serves the frontend)
	// when DATABASE_URL is unset, which keeps `make run` working out of the box.
	var db *database.DB
	if cfg.DatabaseURL != "" {
		var err error
		db, err = database.Connect(ctx, cfg.DatabaseURL)
		if err != nil {
			return err
		}
		defer db.Close()
		slog.Info("connected to database")
	} else {
		slog.Warn("DATABASE_URL not set; starting without a database")
	}

	srv := server.New(cfg, db, assets)
	return srv.Run(ctx)
}
