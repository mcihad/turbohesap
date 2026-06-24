import type { ModuleManifest } from '../models/module'

// IMetadataService fetches this module's manifest from
// /api/<apiVersion>/<name>/metadata.
export interface IMetadataService {
  getMetadata(): Promise<ModuleManifest>
}
