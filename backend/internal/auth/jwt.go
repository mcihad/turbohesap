package auth

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
)

// verifyNonce decodes the id_token payload (without verifying the signature —
// the token came straight from Keycloak over a trusted server-to-server call)
// and checks that its nonce matches the one we issued for this login.
func verifyNonce(idToken, want string) error {
	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		return fmt.Errorf("keycloak: malformed id_token")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return fmt.Errorf("keycloak: cannot decode id_token: %w", err)
	}
	var claims struct {
		Nonce string `json:"nonce"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return fmt.Errorf("keycloak: cannot parse id_token: %w", err)
	}
	if claims.Nonce != want {
		return fmt.Errorf("keycloak: id_token nonce mismatch")
	}
	return nil
}
