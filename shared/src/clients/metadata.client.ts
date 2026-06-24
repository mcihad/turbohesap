import type { AxiosInstance } from 'axios'

import type { ModuleManifest } from '../models/module'
import type { IMetadataService } from '../services/metadata.service'

// MetadataApiClient is the axios-backed implementation of IMetadataService. The
// manifest path is /<apiVersion>/<moduleName>/metadata (relative to /api).
export class MetadataApiClient implements IMetadataService {
  constructor(
    private readonly http: AxiosInstance,
    private readonly apiVersion: string,
    private readonly moduleName: string,
  ) {}

  async getMetadata(): Promise<ModuleManifest> {
    const { data } = await this.http.get<ModuleManifest>(
      `/${this.apiVersion}/${this.moduleName}/metadata`,
    )
    return data
  }
}
