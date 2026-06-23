package main

import (
	"embed"
	"fmt"
	"io/fs"
	"os"

	"kentos-project-template/cmd"
	"kentos-project-template/internal/module"
)

// staticFiles embeds the compiled frontend (produced by `make build-frontend`
// into ./static). go:embed cannot reach parent directories, so this embed
// directive lives in the root package and the resulting FS is injected into the
// command layer. The module manifest is embedded separately by the module
// package itself (its single home is backend/internal/module/kentos.module.json).
//
//go:embed all:static
var staticFiles embed.FS

func main() {
	assets, err := fs.Sub(staticFiles, "static")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	mod, err := module.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	cmd.Execute(assets, mod)
}
