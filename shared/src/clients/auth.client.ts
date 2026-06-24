import type { AxiosInstance } from 'axios'

import type { AuthTokens, CallbackResponse, LogoutResponse } from '../models/auth'
import type { IAuthService } from '../services/auth.service'
import { joinUrl } from '../http/client'

// AuthApiClient is the axios-backed implementation of IAuthService. All calls
// are same-origin against the backend's /api/auth/* endpoints.
export class AuthApiClient implements IAuthService {
  constructor(
    private readonly http: AxiosInstance,
    private readonly baseUrl: string,
  ) {}

  loginUrl(redirect = '/dashboard'): string {
    const url = joinUrl(this.baseUrl, 'auth/login')
    return `${url}?redirect=${encodeURIComponent(redirect)}`
  }

  async exchangeCode(code: string, state: string): Promise<CallbackResponse> {
    const { data } = await this.http.post<CallbackResponse>('/auth/callback', {
      code,
      state,
    })
    return data
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await this.http.post<AuthTokens>('/auth/refresh', {
      refreshToken,
    })
    return data
  }

  async logout(idToken: string, refreshToken: string): Promise<string> {
    try {
      const { data } = await this.http.post<LogoutResponse>('/auth/logout', {
        idToken,
        refreshToken,
      })
      return data.logoutUrl ?? '/login'
    } catch {
      // Even if the IdP/back end is unreachable, let the caller clear state.
      return '/login'
    }
  }
}
