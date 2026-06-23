package server

import "github.com/gofiber/fiber/v3"

// handleHealth reports liveness, and database connectivity when configured.
func (s *Server) handleHealth(c fiber.Ctx) error {
	body := fiber.Map{"status": "ok"}

	if s.db != nil {
		if err := s.db.Ping(c.Context()); err != nil {
			body["status"] = "degraded"
			body["database"] = "down"
			return c.Status(fiber.StatusServiceUnavailable).JSON(body)
		}
		body["database"] = "up"
	}

	return c.JSON(body)
}
