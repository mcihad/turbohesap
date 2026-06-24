import { Injectable } from '@nestjs/common'

// stateTTL bounds how long a login handshake may stay pending between the
// /login redirect and the /callback exchange.
const STATE_TTL_MS = 5 * 60 * 1000

// Pending holds the per-login data we must remember across the redirect to
// Keycloak and back, keyed by the OAuth `state` Keycloak echoes in the callback.
export interface Pending {
  verifier: string // PKCE code_verifier
  nonce: string // OIDC nonce, checked against the id_token
  redirect: string // where to send the user after a successful login
  created: number
}

// StateStore is an in-memory, TTL-bounded store of pending logins.
//
// Note: in-memory means pending logins are lost on restart and are not shared
// across instances — fine for a single instance; a scaled deployment would swap
// this for a shared store (Redis, signed cookie, …).
@Injectable()
export class StateStore {
  private readonly items = new Map<string, Pending>()

  constructor() {
    // Periodic GC of expired entries.
    const timer = setInterval(() => this.gc(), STATE_TTL_MS)
    timer.unref?.()
  }

  put(state: string, p: Pending): void {
    this.items.set(state, p)
  }

  /** Return and remove the pending login for state (single use). */
  take(state: string): Pending | undefined {
    const p = this.items.get(state)
    if (!p) return undefined
    this.items.delete(state)
    if (Date.now() - p.created > STATE_TTL_MS) return undefined
    return p
  }

  private gc(): void {
    const now = Date.now()
    for (const [k, v] of this.items) {
      if (now - v.created > STATE_TTL_MS) this.items.delete(k)
    }
  }
}
