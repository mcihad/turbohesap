import type { AxiosInstance } from 'axios'

import type { ISettingsService } from './settings.service'

// Axios implementation → /api/settings. Each method targets the current user.
export class SettingsApiClient implements ISettingsService {
  constructor(private readonly http: AxiosInstance) {}

  async get<T = unknown>(type: string): Promise<T | null> {
    return (await this.http.get<T | null>(`/settings/${encodeURIComponent(type)}`)).data ?? null
  }

  async set<T = unknown>(type: string, data: T): Promise<void> {
    await this.http.put(`/settings/${encodeURIComponent(type)}`, { data })
  }

  async remove(type: string): Promise<void> {
    await this.http.delete(`/settings/${encodeURIComponent(type)}`)
  }
}
