import type { AxiosInstance } from 'axios'

import type { CurrentUser } from '../iam/user.dto'
import type {
  AuthTokens,
  LoginResponse,
  PosLoginRequest,
  PosSwitchRequest,
  SetPinRequest,
  VerifyPasswordResponse,
} from './auth.dto'
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

  async verifyPassword(password: string): Promise<VerifyPasswordResponse> {
    const { data } = await this.http.post<VerifyPasswordResponse>(
      '/auth/verify-password',
      { password },
    )
    return data
  }

  async posLogin(input: PosLoginRequest): Promise<LoginResponse> {
    const { data } = await this.http.post<LoginResponse>('/auth/pos-login', input)
    return data
  }

  async posSwitch(input: PosSwitchRequest): Promise<LoginResponse> {
    const { data } = await this.http.post<LoginResponse>('/auth/pos-switch', input)
    return data
  }

  async setPin(input: SetPinRequest): Promise<void> {
    await this.http.post('/auth/pos-pin', input)
  }
}

