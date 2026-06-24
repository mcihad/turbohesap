// Module manifest DTO — the parsed view of kentos.module.json served verbatim
// at /api/<apiVersion>/<name>/metadata. Every KentOS app is a "module" that
// declares its identity here.

export interface ModuleApi {
  version: string
}

export interface ModuleManifest {
  name: string
  displayName: string
  description: string
  version: string
  icon: string
  address: string
  roles: string[]
  api: ModuleApi
  author?: string
  tags?: string[]
  // The manifest may carry extra fields not modelled here; keep them readable.
  [key: string]: unknown
}
