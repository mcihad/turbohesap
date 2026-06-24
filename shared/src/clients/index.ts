import type { AxiosInstance } from 'axios'

import type { IAuthService } from '../services/auth.service'
import type { IMeService } from '../services/me.service'
import type { IMetadataService } from '../services/metadata.service'
import type { IHealthService } from '../services/health.service'
import {
  createHttpClient,
  DEFAULT_BASE_URL,
  type HttpClientConfig,
} from '../http/client'
import { AuthApiClient } from './auth.client'
import { MeApiClient } from './me.client'
import { MetadataApiClient } from './metadata.client'
import { HealthApiClient } from './health.client'

export { AuthApiClient } from './auth.client'
export { MeApiClient } from './me.client'
export { MetadataApiClient } from './metadata.client'
export { HealthApiClient } from './health.client'

// KentosApi bundles every service client behind its interface. Consumers depend
// on these interfaces, not the concrete axios classes.
export interface KentosApi {
  auth: IAuthService
  me: IMeService
  metadata: IMetadataService
  health: IHealthService
  /** The underlying axios instance, for app-specific calls. */
  http: AxiosInstance
}

export interface KentosApiConfig extends HttpClientConfig {
  /** API version segment used for the metadata path. Defaults to 'v1'. */
  apiVersion?: string
  /** Module name (kentos.module.json "name") used for the metadata path. */
  moduleName: string
}

// createKentosApi wires the axios http client and every service client into a
// single, typed API object. This is the one entry point apps call.
export function createKentosApi(config: KentosApiConfig): KentosApi {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
  const apiVersion = config.apiVersion ?? 'v1'
  const http = createHttpClient(config)

  return {
    http,
    auth: new AuthApiClient(http, baseUrl),
    me: new MeApiClient(http),
    metadata: new MetadataApiClient(http, apiVersion, config.moduleName),
    health: new HealthApiClient(http),
  }
}
