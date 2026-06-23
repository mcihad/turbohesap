package server

import (
	"encoding/json"
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v3"

	"kentos-project-template/internal/auth"
)

// tokenResponse is the camelCase JSON our API returns to the browser. (The
// internal auth.Tokens struct stays snake_case because it parses Keycloak's
// response; all of OUR API output is camelCase.)
type tokenResponse struct {
	AccessToken      string `json:"accessToken"`
	IDToken          string `json:"idToken"`
	RefreshToken     string `json:"refreshToken"`
	TokenType        string `json:"tokenType"`
	ExpiresIn        int    `json:"expiresIn"`
	RefreshExpiresIn int    `json:"refreshExpiresIn"`
	Scope            string `json:"scope"`
}

func toTokenResponse(t *auth.Tokens) tokenResponse {
	return tokenResponse{
		AccessToken:      t.AccessToken,
		IDToken:          t.IDToken,
		RefreshToken:     t.RefreshToken,
		TokenType:        t.TokenType,
		ExpiresIn:        t.ExpiresIn,
		RefreshExpiresIn: t.RefreshExpiresIn,
		Scope:            t.Scope,
	}
}

// callbackURI is where Keycloak redirects the browser after authentication.
// It is configurable; otherwise it is derived from the request's base URL so it
// works in dev (http://localhost:5800) and behind a proxy alike.
func (s *Server) callbackURI(c fiber.Ctx) string {
	if s.cfg.KeycloakRedirectURI != "" {
		return s.cfg.KeycloakRedirectURI
	}
	return c.BaseURL() + "/auth/callback"
}

// handleAuthLogin redirects the browser to Keycloak to begin login.
// GET /api/auth/login?redirect=/dashboard
func (s *Server) handleAuthLogin(c fiber.Ctx) error {
	postLogin := c.Query("redirect", "/")
	authURL, err := s.auth.AuthURL(c.Context(), s.callbackURI(c), postLogin)
	if err != nil {
		slog.Error("auth login failed", "err", err)
		return fiber.NewError(fiber.StatusServiceUnavailable, "identity provider unavailable")
	}
	return c.Redirect().To(authURL)
}

// handleAuthCallback exchanges the authorization code for tokens.
// POST /api/auth/callback { "code": "...", "state": "..." }
func (s *Server) handleAuthCallback(c fiber.Ctx) error {
	var req struct {
		Code  string `json:"code"`
		State string `json:"state"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil || req.Code == "" || req.State == "" {
		return fiber.NewError(fiber.StatusBadRequest, "code and state are required")
	}

	tokens, redirect, err := s.auth.Exchange(c.Context(), req.Code, req.State, s.callbackURI(c))
	if err != nil {
		if errors.Is(err, auth.ErrUnknownState) {
			return fiber.NewError(fiber.StatusBadRequest, "invalid or expired login state")
		}
		slog.Error("auth callback failed", "err", err)
		return fiber.NewError(fiber.StatusBadGateway, "token exchange failed")
	}

	return c.JSON(struct {
		tokenResponse
		Redirect string `json:"redirect"`
	}{tokenResponse: toTokenResponse(tokens), Redirect: redirect})
}

// handleAuthRefresh swaps a refresh token for a fresh token set.
// POST /api/auth/refresh { "refreshToken": "..." }
func (s *Server) handleAuthRefresh(c fiber.Ctx) error {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil || req.RefreshToken == "" {
		return fiber.NewError(fiber.StatusBadRequest, "refreshToken is required")
	}

	tokens, err := s.auth.Refresh(c.Context(), req.RefreshToken)
	if err != nil {
		slog.Warn("auth refresh failed", "err", err)
		return fiber.NewError(fiber.StatusUnauthorized, "could not refresh session")
	}
	return c.JSON(toTokenResponse(tokens))
}

// handleAuthLogout revokes the Keycloak session and returns the end-session URL.
// POST /api/auth/logout { "idToken": "...", "refreshToken": "..." }
func (s *Server) handleAuthLogout(c fiber.Ctx) error {
	var req struct {
		IDToken      string `json:"idToken"`
		RefreshToken string `json:"refreshToken"`
	}
	_ = json.Unmarshal(c.Body(), &req)

	postLogout := c.BaseURL() + "/login"
	logoutURL, err := s.auth.Logout(c.Context(), req.IDToken, req.RefreshToken, postLogout)
	if err != nil {
		// Even if the IdP is unreachable, let the client clear local state.
		slog.Warn("auth logout: end-session url unavailable", "err", err)
		return c.JSON(fiber.Map{"logoutUrl": postLogout})
	}
	return c.JSON(fiber.Map{"logoutUrl": logoutURL})
}
