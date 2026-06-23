// Package auth implements the backend half of the Keycloak (OIDC) login flow.
//
// The client is confidential: the client secret lives only here, and the
// browser never sees it. The backend builds the Keycloak authorization URL
// (Authorization Code + PKCE), exchanges the code for tokens, and refreshes
// them. Tokens are handed to the frontend, which stores and uses them.
//
// The OIDC client_id is the module name (kentos.module.json "name").
package auth

import "errors"

// ErrNotConfigured is returned when Keycloak discovery cannot be reached.
var ErrNotConfigured = errors.New("keycloak: discovery unavailable")

// ErrUnknownState is returned when a callback presents a state we did not issue
// (expired, replayed, or forged).
var ErrUnknownState = errors.New("keycloak: unknown or expired state")

// Tokens mirrors the Keycloak token endpoint response.
type Tokens struct {
	AccessToken      string `json:"access_token"`
	IDToken          string `json:"id_token"`
	RefreshToken     string `json:"refresh_token"`
	TokenType        string `json:"token_type"`
	ExpiresIn        int    `json:"expires_in"`
	RefreshExpiresIn int    `json:"refresh_expires_in"`
	Scope            string `json:"scope"`
}

// discovery is the subset of the OpenID configuration document we use.
type discovery struct {
	Issuer                string `json:"issuer"`
	AuthorizationEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint         string `json:"token_endpoint"`
	EndSessionEndpoint    string `json:"end_session_endpoint"`
	UserinfoEndpoint      string `json:"userinfo_endpoint"`
	JWKSURI               string `json:"jwks_uri"`
}
