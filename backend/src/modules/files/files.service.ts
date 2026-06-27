import { randomUUID } from 'node:crypto'

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { FileDto } from '@turbohesap/shared'

import { FileEntity } from './entities/file.entity'
import { STORAGE_DRIVER, type StorageDriver } from './storage/storage.driver'
import type { UpdateFileDto } from './dto/update-file.dto'
import type { UploadFileDto } from './dto/upload-file.dto'

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
  ) {}

  // Store each uploaded file under a random name and record its metadata. Returns
  // the created rows (DTOs). Files may be attached to an entity (meta) or left
  // standalone and attached later.
  async upload(
    uploaded: Express.Multer.File[],
    meta: UploadFileDto,
    userId: string | null,
  ): Promise<FileDto[]> {
    if (!uploaded || uploaded.length === 0) {
      throw new BadRequestException('Yüklenecek dosya bulunamadı')
    }
    const created: FileEntity[] = []
    let order = meta.sortOrder ?? 0
    for (const f of uploaded) {
      const ext = extensionOf(f.originalname)
      const storedName = ext ? `${randomUUID()}.${ext}` : randomUUID()
      const isImage = (f.mimetype ?? '').startsWith('image/')
      await this.storage.save(storedName, f.buffer, f.mimetype)
      const row = this.files.create({
        originalName: f.originalname,
        storedName,
        mimeType: f.mimetype || 'application/octet-stream',
        extension: ext,
        size: f.size ?? f.buffer.length,
        kind: meta.kind ?? (isImage ? 'image' : 'file'),
        isImage,
        storage: this.storage.name,
        entityType: meta.entityType || null,
        entityId: meta.entityId || null,
        sortOrder: order++,
        uploadedById: userId,
      })
      created.push(await this.files.save(row))
    }
    return created.map(toFileDto)
  }

  async list(entityType: string, entityId: string): Promise<FileDto[]> {
    const rows = await this.files.find({
      where: { entityType, entityId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    })
    return rows.map(toFileDto)
  }

  async get(id: string): Promise<FileDto> {
    return toFileDto(await this.findOrFail(id))
  }

  async update(id: string, dto: UpdateFileDto): Promise<FileDto> {
    const row = await this.findOrFail(id)
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder
    if (dto.originalName !== undefined) row.originalName = dto.originalName
    if (dto.kind !== undefined) row.kind = dto.kind
    if (dto.entityType !== undefined) row.entityType = dto.entityType ?? null
    if (dto.entityId !== undefined) row.entityId = dto.entityId ?? null
    return toFileDto(await this.files.save(row))
  }

  async remove(id: string): Promise<void> {
    const row = await this.findOrFail(id)
    try {
      await this.storage.delete(row.storedName)
    } catch {
      // Bytes already gone / unreachable — still drop the row.
    }
    await this.files.remove(row)
  }

  // Read raw bytes by the unguessable storedName (powers the public serve route).
  async readRaw(storedName: string): Promise<{ buffer: Buffer; mimeType: string; originalName: string }> {
    const row = await this.files.findOne({ where: { storedName } })
    if (!row) throw new NotFoundException('Dosya bulunamadı')
    const buffer = await this.storage.read(storedName)
    return { buffer, mimeType: row.mimeType, originalName: row.originalName }
  }

  private async findOrFail(id: string): Promise<FileEntity> {
    const row = await this.files.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Dosya bulunamadı')
    return row
  }
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : ''
}

export function toFileDto(f: FileEntity): FileDto {
  return {
    id: f.id,
    originalName: f.originalName,
    storedName: f.storedName,
    mimeType: f.mimeType,
    extension: f.extension,
    size: f.size,
    kind: f.kind,
    isImage: f.isImage,
    storage: f.storage,
    entityType: f.entityType,
    entityId: f.entityId,
    sortOrder: f.sortOrder,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }
}
