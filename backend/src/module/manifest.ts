import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import type { ModuleManifest } from '@kentos/shared'

// The module manifest (kentos.module.json) is the single source of truth for
// this module's identity (name, roles, api version, …). The OIDC client_id is
// the manifest "name". It is read from the filesystem so editing the JSON (or
// the init-module skill) is picked up without recompiling.

const MANIFEST_FILE = 'kentos.module.json'

/** Walk up from a starting directory looking for kentos.module.json. */
function findManifestPath(): string {
  // Candidates: alongside the running code (dist/.. or src/..) and the cwd.
  const starts = [__dirname, process.cwd()]
  for (const start of starts) {
    let dir = start
    // Climb a few levels — enough to reach the backend package root from dist/.
    for (let i = 0; i < 6; i++) {
      const candidate = join(dir, MANIFEST_FILE)
      if (existsSync(candidate)) return candidate
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  throw new Error(`${MANIFEST_FILE} not found (searched up from dist/src and cwd)`)
}

let cached: ModuleManifest | null = null

/** Load and validate the module manifest (cached after first read). */
export function loadManifest(): ModuleManifest {
  if (cached) return cached

  const path = findManifestPath()
  const raw = readFileSync(path, 'utf-8')
  const parsed = JSON.parse(raw) as ModuleManifest

  if (!parsed.name || !parsed.name.trim()) {
    throw new Error('module manifest: "name" is required')
  }
  if (!parsed.api?.version) {
    parsed.api = { ...(parsed.api ?? {}), version: 'v1' }
  }

  cached = parsed
  return parsed
}

/** Route where the module serves its metadata, e.g. v1/<name>/metadata. */
export function metadataPath(manifest: ModuleManifest): string {
  return `${manifest.api.version}/${manifest.name}/metadata`
}
