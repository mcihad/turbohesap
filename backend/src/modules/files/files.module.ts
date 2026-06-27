import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { configuration } from '../../config/configuration'
import { FileEntity } from './entities/file.entity'
import { FilesController } from './files.controller'
import { FilesService } from './files.service'
import { LocalStorageDriver } from './storage/local-storage.driver'
import { S3StorageDriver } from './storage/s3-storage.driver'
import { STORAGE_DRIVER, type StorageDriver } from './storage/storage.driver'

// Files — generic uploads/attachments for any entity. The active StorageDriver
// (local dir or S3) is chosen from config at startup. Served under /api/files.
@Module({
  imports: [TypeOrmModule.forFeature([FileEntity])],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: STORAGE_DRIVER,
      useFactory: (): StorageDriver => {
        const f = configuration().files
        return f.driver === 's3'
          ? new S3StorageDriver(f.s3)
          : new LocalStorageDriver(f.localDir)
      },
    },
  ],
})
export class FilesModule {}
