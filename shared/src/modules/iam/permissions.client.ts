import type { AxiosInstance } from 'axios'

import type { PermissionDto } from './permission.dto'
import type { IPermissionsService } from './permissions.service'

// axios-backed implementation of IPermissionsService → /api/iam/permissions.
export class PermissionsApiClient implements IPermissionsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<PermissionDto[]> {
    const { data } = await this.http.get<PermissionDto[]>('/iam/permissions')
    return data
  }
}
