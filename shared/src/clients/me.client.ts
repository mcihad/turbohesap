import type { AxiosInstance } from 'axios'

import type { CurrentUser } from '../models/user'
import type { IMeService } from '../services/me.service'

// MeApiClient is the axios-backed implementation of IMeService.
export class MeApiClient implements IMeService {
  constructor(private readonly http: AxiosInstance) {}

  async getMe(): Promise<CurrentUser> {
    const { data } = await this.http.get<CurrentUser>('/me')
    return data
  }
}
