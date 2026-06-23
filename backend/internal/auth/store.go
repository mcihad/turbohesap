package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"sync"
	"time"
)

// stateTTL bounds how long a login handshake may stay pending between the
// /login redirect and the /callback exchange.
const stateTTL = 5 * time.Minute

// pending holds the per-login data we must remember across the redirect to
// Keycloak and back. Keyed by the OAuth `state`, which Keycloak echoes in the
// callback URL — so no cookie is needed to correlate the two requests.
type pending struct {
	verifier string // PKCE code_verifier
	nonce    string // OIDC nonce, checked against the id_token
	redirect string // where to send the user after a successful login
	created  time.Time
}

// stateStore is an in-memory, TTL-bounded store of pending logins.
//
// Note: in-memory means pending logins are lost on restart and are not shared
// across instances. That is fine for a single binary; a horizontally-scaled
// deployment would swap this for a shared store (Redis, signed cookie, …).
type stateStore struct {
	mu    sync.Mutex
	items map[string]pending
}

func newStateStore() *stateStore {
	s := &stateStore{items: make(map[string]pending)}
	go s.gc()
	return s
}

func (s *stateStore) put(state string, p pending) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[state] = p
}

// take returns and removes the pending login for state (single use).
func (s *stateStore) take(state string) (pending, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.items[state]
	if ok {
		delete(s.items, state)
	}
	if ok && time.Since(p.created) > stateTTL {
		return pending{}, false
	}
	return p, ok
}

func (s *stateStore) gc() {
	for range time.Tick(stateTTL) {
		s.mu.Lock()
		for k, v := range s.items {
			if time.Since(v.created) > stateTTL {
				delete(s.items, k)
			}
		}
		s.mu.Unlock()
	}
}

// randomString returns n bytes of crypto-random data, base64url-encoded.
func randomString(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// pkceChallenge derives the S256 code_challenge from a verifier.
func pkceChallenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}
