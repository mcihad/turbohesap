import { AsyncLocalStorage } from 'node:async_hooks'

// Per-request ambient context, propagated via AsyncLocalStorage so code far from
// the controller (the TypeORM audit subscriber, the exception filter) can read
// who/where a change or error came from without threading it through every call.
//
// Populated in two phases: RequestContextMiddleware seeds ip/method/path at the
// start of the request; JwtAuthGuard fills in userId/userName once the token is
// verified. Both run inside the same als.run() scope (the middleware wraps the
// whole downstream chain), so the same store object is visible throughout.
export interface RequestStore {
  /** Correlation id for the request (also returned as the X-Request-Id header). */
  requestId: string
  userId: string | null
  userName: string | null
  ipAddress: string | null
  method: string | null
  path: string | null
}

const als = new AsyncLocalStorage<RequestStore>()

export const RequestContext = {
  run<T>(store: RequestStore, fn: () => T): T {
    return als.run(store, fn)
  },
  get(): RequestStore | undefined {
    return als.getStore()
  },
}
