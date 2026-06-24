import axios, { type AxiosInstance } from 'axios'

// HttpClientConfig configures the shared axios instance the service clients run
// on. It is intentionally environment-agnostic: the web app passes a
// localStorage-backed token getter, the mobile app an AsyncStorage-backed one.
export interface HttpClientConfig {
  /**
   * Base path/URL of the JSON API. Defaults to '/api' (same-origin, the way the
   * NestJS backend serves it alongside the SPA). A React Native app would pass
   * an absolute URL like 'https://app.example.com/api'.
   */
  baseUrl?: string

  /**
   * Returns the current access token (or null) to attach as a Bearer header.
   * May be sync or async.
   */
  getAccessToken?: () => string | null | Promise<string | null>

  /** Called when the backend answers 401 (e.g. to trigger a refresh/logout). */
  onUnauthorized?: () => void
}

export const DEFAULT_BASE_URL = '/api'

// createHttpClient builds the configured axios instance shared by every service
// client. It attaches the Bearer token on each request and surfaces 401s.
export function createHttpClient(config: HttpClientConfig = {}): AxiosInstance {
  const baseURL = config.baseUrl ?? DEFAULT_BASE_URL

  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  })

  if (config.getAccessToken) {
    instance.interceptors.request.use(async (req) => {
      const token = await config.getAccessToken!()
      if (token) {
        req.headers.set('Authorization', `Bearer ${token}`)
      }
      return req
    })
  }

  if (config.onUnauthorized) {
    instance.interceptors.response.use(
      (res) => res,
      (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          config.onUnauthorized!()
        }
        return Promise.reject(error)
      },
    )
  }

  return instance
}

/** Join a base path and a relative segment without doubling the slash. */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}
