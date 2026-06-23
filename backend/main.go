package main

import (
	"embed"
	"io/fs"

	"kentos-project-template/cmd"
)

// staticFiles embeds the compiled frontend (produced by `make build-frontend`
// into ./static). go:embed cannot reach parent directories, so the embed
// directive must live in this root package — hence the FS is injected into the
// command layer rather than declared deeper in the tree.
//
//go:embed all:static
var staticFiles embed.FS

func main() {
	assets, err := fs.Sub(staticFiles, "static")
	if err != nil {
		panic(err)
	}
	cmd.Execute(assets)
}
