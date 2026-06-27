// Storage abstraction — the bytes of an uploaded file live behind one of these
// drivers (local directory or S3), selected by config. The DB keeps all
// metadata; the driver only moves opaque bytes keyed by the random `storedName`.

export interface StorageDriver {
  /** Which backend this is — persisted on the file row so it's served correctly. */
  readonly name: 'local' | 's3'
  save(storedName: string, buffer: Buffer, mimeType: string): Promise<void>
  read(storedName: string): Promise<Buffer>
  delete(storedName: string): Promise<void>
}

/** DI token for the active StorageDriver (resolved from config in FilesModule). */
export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER')
