import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

import type { AppConfig } from '../../../config/configuration'
import type { StorageDriver } from './storage.driver'

type S3Config = AppConfig['files']['s3']

// Stores file bytes in an S3 bucket (or any S3-compatible store via `endpoint`,
// e.g. MinIO / Cloudflare R2). Keyed by the random storedName.
export class S3StorageDriver implements StorageDriver {
  readonly name = 's3' as const
  private readonly client: S3Client
  private readonly bucket: string

  constructor(cfg: S3Config) {
    this.bucket = cfg.bucket
    this.client = new S3Client({
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}),
      forcePathStyle: cfg.forcePathStyle,
    })
  }

  async save(storedName: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: storedName, Body: buffer, ContentType: mimeType }),
    )
  }

  async read(storedName: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: storedName }))
    const bytes = await res.Body!.transformToByteArray()
    return Buffer.from(bytes)
  }

  async delete(storedName: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storedName }))
  }
}
