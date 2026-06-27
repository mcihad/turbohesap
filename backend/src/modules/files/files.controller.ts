import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'

import { FilesPermissions, type FileDto } from '@turbohesap/shared'

import { configuration } from '../../config/configuration'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { UpdateFileDto } from './dto/update-file.dto'
import { UploadFileDto } from './dto/upload-file.dto'
import { FilesService } from './files.service'

const MAX_FILE_SIZE = configuration().files.maxSizeMb * 1024 * 1024

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  // Upload one or more files (multipart `files`) + metadata. Unlimited count;
  // per-file size capped by FILE_MAX_SIZE_MB.
  @Post()
  @RequirePermissions(FilesPermissions.write)
  @UseInterceptors(FilesInterceptor('files', undefined, { limits: { fileSize: MAX_FILE_SIZE } }))
  upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() meta: UploadFileDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FileDto[]> {
    return this.files.upload(files, meta, user?.sub ?? null)
  }

  @Get()
  @RequirePermissions(FilesPermissions.read)
  list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ): Promise<FileDto[]> {
    return this.files.list(entityType, entityId)
  }

  // Public raw bytes — the random storedName is an unguessable capability, so
  // this works in <img src> / <Image> without auth headers.
  @Public()
  @Get('raw/:storedName')
  async raw(@Param('storedName') storedName: string, @Res() res: Response): Promise<void> {
    let file: { buffer: Buffer; mimeType: string; originalName: string }
    try {
      file = await this.files.readRaw(storedName)
    } catch {
      throw new NotFoundException('Dosya bulunamadı')
    }
    res.setHeader('Content-Type', file.mimeType)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.send(file.buffer)
  }

  @Get(':id')
  @RequirePermissions(FilesPermissions.read)
  get(@Param('id') id: string): Promise<FileDto> {
    return this.files.get(id)
  }

  @Patch(':id')
  @RequirePermissions(FilesPermissions.write)
  update(@Param('id') id: string, @Body() dto: UpdateFileDto): Promise<FileDto> {
    return this.files.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(FilesPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.files.remove(id)
  }
}
