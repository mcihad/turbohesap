import type { AxiosInstance } from 'axios'

import { AuthApiClient } from '../modules/auth/auth.client'
import type { IAuthService } from '../modules/auth/auth.service'
import { UsersApiClient } from '../modules/iam/users.client'
import type { IUsersService } from '../modules/iam/users.service'
import { RolesApiClient } from '../modules/iam/roles.client'
import type { IRolesService } from '../modules/iam/roles.service'
import { PermissionsApiClient } from '../modules/iam/permissions.client'
import type { IPermissionsService } from '../modules/iam/permissions.service'
import { AuditLogsApiClient } from '../modules/iam/audit-logs.client'
import type { IAuditLogsService } from '../modules/iam/audit-logs.service'
import { ErrorLogsApiClient } from '../modules/iam/error-logs.client'
import type { IErrorLogsService } from '../modules/iam/error-logs.service'
import { HealthApiClient } from '../modules/health/health.client'
import type { IHealthService } from '../modules/health/health.service'
import { createHttpClient, type HttpClientConfig } from './http'

// Resources are grouped by module — `api.<module>.<resource>` — mirroring the
// `/api/<module>/<resource>` routes. A module with a single service (auth,
// health) is exposed directly; a module with multiple resources (iam) groups
// them. This keeps resource names from colliding as modules grow.
export interface IamApi {
  users: IUsersService
  roles: IRolesService
  permissions: IPermissionsService
  auditLogs: IAuditLogsService
  errorLogs: IErrorLogsService
}

// TurbohesapApi bundles every module's service client behind its interface.
// Consumers depend on these interfaces, not the concrete axios classes. Add new
// modules here (a new top-level key, or grouped like `iam`).
export interface TurbohesapApi {
  auth: IAuthService
  iam: IamApi
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
    iam: {
      users: new UsersApiClient(http),
      roles: new RolesApiClient(http),
      permissions: new PermissionsApiClient(http),
      auditLogs: new AuditLogsApiClient(http),
      errorLogs: new ErrorLogsApiClient(http),
    },
    health: new HealthApiClient(http),
  }
}
