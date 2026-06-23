package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Service runs the confidential Authorization Code + PKCE flow against Keycloak,
// and verifies access tokens (JWKS) for protected API routes.
type Service struct {
	issuer       string
	clientID     string
	clientSecret string
	discoveryURL string
	http         *http.Client
	states       *stateStore

	mu       sync.Mutex
	disc     *discovery    // cached OpenID configuration
	verifier tokenVerifier // lazily-initialised JWKS verifier (guarded by mu)
}

// NewService builds an auth Service. clientID is the module name; issuer is the
// Keycloak realm URL (e.g. http://localhost:8080/realms/sivasbeltr).
func NewService(issuer, clientID, clientSecret string) *Service {
	return &Service{
		issuer:       issuer,
		clientID:     clientID,
		clientSecret: clientSecret,
		discoveryURL: issuer + "/.well-known/openid-configuration",
		http:         &http.Client{Timeout: 10 * time.Second},
		states:       newStateStore(),
	}
}

// discover fetches and caches the OpenID configuration.
func (s *Service) discover(ctx context.Context) (*discovery, error) {
	s.mu.Lock()
	cached := s.disc
	s.mu.Unlock()
	if cached != nil {
		return cached, nil
	}

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, s.discoveryURL, nil)
	resp, err := s.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrNotConfigured, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: discovery returned %d", ErrNotConfigured, resp.StatusCode)
	}

	var d discovery
	if err := json.NewDecoder(resp.Body).Decode(&d); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrNotConfigured, err)
	}

	s.mu.Lock()
	s.disc = &d
	s.mu.Unlock()
	return &d, nil
}

// AuthURL starts a login: it records the PKCE/state/nonce and returns the
// Keycloak authorization URL the browser should be redirected to. postLogin is
// where the user is sent after a successful callback.
func (s *Service) AuthURL(ctx context.Context, redirectURI, postLogin string) (string, error) {
	d, err := s.discover(ctx)
	if err != nil {
		return "", err
	}

	state := randomString(32)
	verifier := randomString(48)
	nonce := randomString(24)
	s.states.put(state, pending{verifier: verifier, nonce: nonce, redirect: postLogin, created: time.Now()})

	q := url.Values{}
	q.Set("client_id", s.clientID)
	q.Set("redirect_uri", redirectURI)
	q.Set("response_type", "code")
	q.Set("scope", "openid")
	q.Set("state", state)
	q.Set("nonce", nonce)
	q.Set("code_challenge", pkceChallenge(verifier))
	q.Set("code_challenge_method", "S256")

	return d.AuthorizationEndpoint + "?" + q.Encode(), nil
}

// Exchange completes the login: it validates state, swaps the code for tokens
// (using the client secret + PKCE verifier), checks the id_token nonce, and
// returns the tokens plus the stored post-login redirect.
func (s *Service) Exchange(ctx context.Context, code, state, redirectURI string) (*Tokens, string, error) {
	p, ok := s.states.take(state)
	if !ok {
		return nil, "", ErrUnknownState
	}

	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", redirectURI)
	form.Set("code_verifier", p.verifier)

	tokens, err := s.tokenRequest(ctx, form)
	if err != nil {
		return nil, "", err
	}
	if err := verifyNonce(tokens.IDToken, p.nonce); err != nil {
		return nil, "", err
	}
	return tokens, p.redirect, nil
}

// Refresh swaps a refresh token for a fresh token set.
func (s *Service) Refresh(ctx context.Context, refreshToken string) (*Tokens, error) {
	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("refresh_token", refreshToken)
	return s.tokenRequest(ctx, form)
}

// Logout revokes the session at Keycloak (best effort) and returns the
// end-session URL the browser should visit to clear the Keycloak cookie.
func (s *Service) Logout(ctx context.Context, idToken, refreshToken, postLogout string) (string, error) {
	d, err := s.discover(ctx)
	if err != nil {
		return "", err
	}

	if refreshToken != "" {
		form := url.Values{}
		form.Set("client_id", s.clientID)
		form.Set("client_secret", s.clientSecret)
		form.Set("refresh_token", refreshToken)
		logoutEndpoint := strings.Replace(d.TokenEndpoint, "/token", "/logout", 1)
		req, _ := http.NewRequestWithContext(ctx, http.MethodPost, logoutEndpoint, strings.NewReader(form.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		if resp, e := s.http.Do(req); e == nil {
			resp.Body.Close()
		}
	}

	q := url.Values{}
	q.Set("client_id", s.clientID)
	if idToken != "" {
		q.Set("id_token_hint", idToken)
	}
	if postLogout != "" {
		q.Set("post_logout_redirect_uri", postLogout)
	}
	return d.EndSessionEndpoint + "?" + q.Encode(), nil
}

// tokenRequest posts to the token endpoint with client authentication.
func (s *Service) tokenRequest(ctx context.Context, form url.Values) (*Tokens, error) {
	d, err := s.discover(ctx)
	if err != nil {
		return nil, err
	}
	form.Set("client_id", s.clientID)
	form.Set("client_secret", s.clientSecret)

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, d.TokenEndpoint, strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, fmt.Errorf("keycloak token endpoint returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var t Tokens
	if err := json.NewDecoder(resp.Body).Decode(&t); err != nil {
		return nil, err
	}
	return &t, nil
}
