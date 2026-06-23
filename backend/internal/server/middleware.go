package server

import (
	"github.com/gofiber/fiber/v3"

	"kentos-project-template/internal/auth"
)

const claimsLocalsKey = "claims"

// RolesRequired returns middleware that requires a valid Keycloak access token
// (verified against the JWKS) and, when roles are given, that the caller has at
// least one of them — checked against realm roles and this module's client
// roles. With no roles it just requires a valid token.
//
//	api.Get("/reports", s.RolesRequired("Manager", "Admin"), s.handleReports)
func (s *Server) RolesRequired(anyOf ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		raw := auth.BearerToken(c.Get(fiber.HeaderAuthorization))
		if raw == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing bearer token")
		}

		claims, err := s.auth.VerifyToken(c.Context(), raw)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		}
		if !claims.HasAnyRole(s.mod.Name, anyOf) {
			return fiber.NewError(fiber.StatusForbidden, "insufficient role")
		}

		c.Locals(claimsLocalsKey, claims)
		return c.Next()
	}
}

// claimsFrom returns the verified claims stashed by RolesRequired, or nil.
func claimsFrom(c fiber.Ctx) *auth.Claims {
	if v, ok := c.Locals(claimsLocalsKey).(*auth.Claims); ok {
		return v
	}
	return nil
}

// handleMe returns the verified caller (identity + roles). Mounted behind
// RolesRequired(), so a valid token is guaranteed here.
func (s *Server) handleMe(c fiber.Ctx) error {
	claims := claimsFrom(c)
	if claims == nil {
		return fiber.NewError(fiber.StatusUnauthorized, "no claims")
	}
	return c.JSON(fiber.Map{
		"sub":               claims.Subject,
		"preferredUsername": claims.PreferredUsername,
		"email":             claims.Email,
		"name":              claims.Name,
		"roles":             claims.Roles(s.mod.Name),
	})
}
