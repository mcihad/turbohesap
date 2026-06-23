package server

import (
	"fmt"
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
			s.setHTMLCacheHeaders(c)
			c.Set(fiber.HeaderContentType, fiber.MIMETextHTMLCharsetUTF8)
			return c.Send(index)
		}

		if ct := mime.TypeByExtension(filepath.Ext(reqPath)); ct != "" {
			c.Set(fiber.HeaderContentType, ct)
		}

		// The frontend is rebuilt frequently, so cache conservatively (default
		// 1 hour, configurable via STATIC_CACHE_MAX_AGE). The HTML entrypoint is
		// never cached so a new build is always picked up immediately; hashed
		// assets get the short max-age.
		if reqPath == "index.html" {
			s.setHTMLCacheHeaders(c)
		} else {
			c.Set(fiber.HeaderCacheControl, fmt.Sprintf("public, max-age=%d", s.cfg.StaticCacheMaxAge))
		}

		return c.Send(data)
	})
}

// setHTMLCacheHeaders marks the SPA entrypoint as always-revalidate so clients
// pick up a fresh build immediately.
func (s *Server) setHTMLCacheHeaders(c fiber.Ctx) {
	c.Set(fiber.HeaderCacheControl, "no-cache")
}
