import { Controller, Get } from '@nestjs/common'

import type { ModuleManifest } from '@kentos/shared'

import { loadManifest, metadataPath } from '../module/manifest'

// The metadata route is computed from the manifest at class-definition time, so
// it is exactly /<apiVersion>/<name>/metadata (under the global /api prefix) —
// e.g. /api/v1/kentos-project-template/metadata.
const METADATA_ROUTE = metadataPath(loadManifest())

// MetadataController serves the module manifest (kentos.module.json) verbatim.
@Controller()
export class MetadataController {
  @Get(METADATA_ROUTE)
  metadata(): ModuleManifest {
    return loadManifest()
  }
}
