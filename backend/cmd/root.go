package cmd

import (
	"fmt"
	"io/fs"
	"os"

	"github.com/spf13/cobra"
)

// assets holds the embedded frontend build, injected from main via Execute.
var assets fs.FS

// rootCmd is the base command. Running the binary with no subcommand prints help.
var rootCmd = &cobra.Command{
	Use:   "kentos",
	Short: "KentOS Console — single-binary backend serving the embedded frontend",
	Long: `KentOS Console backend.

A Fiber (v3) HTTP server that embeds the compiled frontend (go:embed) and serves
it as a single self-contained binary, alongside a JSON API backed by PostgreSQL
(pgx). Use subcommands to run the server or inspect the build.`,
}

// Execute runs the root command with the embedded frontend assets and exits
// non-zero on error.
func Execute(frontend fs.FS) {
	assets = frontend
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
