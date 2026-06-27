import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

import type { StorageDriver } from './storage.driver'

// Stores file bytes in a local directory (FILE_LOCAL_DIR). Flat layout keyed by
// the random storedName — good for single-node / dev. Use S3 for multi-instance.
export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local' as const
  private readonly dir: string

  constructor(dir: string) {
    this.dir = isAbsolute(dir) ? dir : resolve(process.cwd(), dir)
  }

  private path(storedName: string): string {
    return join(this.dir, storedName)
  }

  async save(storedName: string, buffer: Buffer): Promise<void> {
    await mkdir(this.dir, { recursive: true })
    await writeFile(this.path(storedName), buffer)
  }

  async read(storedName: string): Promise<Buffer> {
    return readFile(this.path(storedName))
  }

  async delete(storedName: string): Promise<void> {
    await rm(this.path(storedName), { force: true })
  }
}
