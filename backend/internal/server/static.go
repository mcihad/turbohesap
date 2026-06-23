package server

import (
	"io/fs"
	"mime"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// registerStatic serves the embedded frontend with single-page-app semantics:
// real files are streamed as-is, unknown non-API paths fall back to index.html
// so client-side routing (TanStack Router) keeps working on deep links / reload.
func (s *Server) registerStatic() {
	s.app.Get("/*", func(c fiber.Ctx) error {
		reqPath := strings.TrimPrefix(c.Path(), "/")
		if reqPath == "" {
			reqPath = "index.html"
		}

		data, err := fs.ReadFile(s.assets, reqPath)
		if err != nil {
			// Unknown /api paths are genuine 404s, not SPA routes.
			if strings.HasPrefix(c.Path(), "/api") {
				return fiber.ErrNotFound
			}
			index, ierr := fs.ReadFile(s.assets, "index.html")
			if ierr != nil {
				return fiber.ErrNotFound
			}
			c.Set(fiber.HeaderContentType, fiber.MIMETextHTMLCharsetUTF8)
			return c.Send(index)
		}

		if ct := mime.TypeByExtension(filepath.Ext(reqPath)); ct != "" {
			c.Set(fiber.HeaderContentType, ct)
		}
		// Vite emits content-hashed filenames under assets/, so cache them hard.
		if strings.HasPrefix(reqPath, "assets/") {
			c.Set(fiber.HeaderCacheControl, "public, max-age=31536000, immutable")
		}

		return c.Send(data)
	})
}
