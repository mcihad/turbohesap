import type { AxiosInstance } from 'axios'

import { AuthApiClient } from '../modules/auth/auth.client'
import type { IAuthService } from '../modules/auth/auth.service'
import { UsersApiClient } from '../modules/iam/users.client'
import type { IUsersService } from '../modules/iam/users.service'
import { RolesApiClient } from '../modules/iam/roles.client'
import type { IRolesService } from '../modules/iam/roles.service'
import { PermissionsApiClient } from '../modules/iam/permissions.client'
import type { IPermissionsService } from '../modules/iam/permissions.service'
import { HealthApiClient } from '../modules/health/health.client'
import type { IHealthService } from '../modules/health/health.service'
import { createHttpClient, type HttpClientConfig } from './http'

// TurbohesapApi bundles every module's service client behind its interface.
// Consumers depend on these interfaces, not the concrete axios classes. As new
// modules are added, expose their service here (and add the client to the
// factory below).
export interface TurbohesapApi {
  auth: IAuthService
  users: IUsersService
  roles: IRolesService
  permissions: IPermissionsService
  health: IHealthService
  /** The underlying axios instance, for app-specific calls. */
  http: AxiosInstance
}

export type TurbohesapApiConfig = HttpClientConfig

// createTurbohesapApi wires the axios http client and every module's service
// client into a single, typed API object. This is the one entry point apps call
// — the web frontend and the mobile app each pass their own platform config.
export function createTurbohesapApi(
  config: TurbohesapApiConfig = {},
): TurbohesapApi {
  const http = createHttpClient(config)
  return {
    http,
    auth: new AuthApiClient(http),
    users: new UsersApiClient(http),
    roles: new RolesApiClient(http),
    permissions: new PermissionsApiClient(http),
    health: new HealthApiClient(http),
  }
}
