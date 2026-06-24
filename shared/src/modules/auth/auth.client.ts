import type { AxiosInstance } from 'axios'

import type { CurrentUser } from '../iam/user.dto'
import type { AuthTokens, LoginResponse } from './auth.dto'
import type { IAuthService } from './auth.service'

// axios-backed implementation of IAuthService → /api/auth/*.
export class AuthApiClient implements IAuthService {
  constructor(private readonly http: AxiosInstance) {}

  async login(username: string, password: string): Promise<LoginResponse> {
    const { data } = await this.http.post<LoginResponse>('/auth/login', {
      username,
      password,
    })
    return data
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await this.http.post<AuthTokens>('/auth/refresh', {
      refreshToken,
    })
    return data
  }

  async logout(refreshToken: string): Promise<void> {
    await this.http.post('/auth/logout', { refreshToken })
  }

  async me(): Promise<CurrentUser> {
    const { data } = await this.http.get<CurrentUser>('/auth/me')
    return data
  }

  async permissions(): Promise<string[]> {
    const { data } = await this.http.get<string[]>('/auth/permissions')
    return data
  }
}
