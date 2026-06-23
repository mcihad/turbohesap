package auth

import (
	"context"
	"fmt"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
)

// tokenVerifier is the JWKS-backed access-token verifier (aliased so the rest of
// the package need not import go-oidc directly).
type tokenVerifier = *oidc.IDTokenVerifier

// Claims is the subset of access-token claims we use for authorization/identity.
type Claims struct {
	Subject           string `json:"sub"`
	PreferredUsername string `json:"preferred_username"`
	Email             string `json:"email"`
	Name              string `json:"name"`
	AuthorizedParty   string `json:"azp"`
	RealmAccess       struct {
		Roles []string `json:"roles"`
	} `json:"realm_access"`
	ResourceAccess map[string]struct {
		Roles []string `json:"roles"`
	} `json:"resource_access"`
}

// Roles returns realm roles plus the given client's resource roles.
func (c *Claims) Roles(clientID string) []string {
	roles := append([]string{}, c.RealmAccess.Roles...)
	if ra, ok := c.ResourceAccess[clientID]; ok {
		roles = append(roles, ra.Roles...)
	}
	return roles
}

// HasAnyRole reports whether the token carries at least one of want (realm or
// the client's resource roles). An empty want means "any valid token is enough".
func (c *Claims) HasAnyRole(clientID string, want []string) bool {
	if len(want) == 0 {
		return true
	}
	have := make(map[string]struct{}, 8)
	for _, r := range c.Roles(clientID) {
		have[r] = struct{}{}
	}
	for _, w := range want {
		if _, ok := have[w]; ok {
			return true
		}
	}
	return false
}

// initVerifier lazily builds the JWKS-backed verifier from Keycloak discovery.
// It retries on the next call if Keycloak was unreachable.
func (s *Service) initVerifier(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.verifier != nil {
		return nil
	}
	provider, err := oidc.NewProvider(ctx, s.issuer)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrNotConfigured, err)
	}
	// Access tokens: verify signature/issuer/expiry. Keycloak's `aud` is not the
	// client id, so skip the audience (client-id) check.
	s.verifier = provider.Verifier(&oidc.Config{SkipClientIDCheck: true})
	return nil
}

// VerifyToken validates a raw access token (signature, issuer, expiry) against
// Keycloak's JWKS and returns its claims.
func (s *Service) VerifyToken(ctx context.Context, raw string) (*Claims, error) {
	if err := s.initVerifier(ctx); err != nil {
		return nil, err
	}
	tok, err := s.verifier.Verify(ctx, raw)
	if err != nil {
		return nil, err
	}
	var claims Claims
	if err := tok.Claims(&claims); err != nil {
		return nil, err
	}
	return &claims, nil
}

// BearerToken extracts the token from an "Authorization: Bearer <token>" header.
func BearerToken(header string) string {
	const prefix = "Bearer "
	if len(header) > len(prefix) && strings.EqualFold(header[:len(prefix)], prefix) {
		return strings.TrimSpace(header[len(prefix):])
	}
	return ""
}
