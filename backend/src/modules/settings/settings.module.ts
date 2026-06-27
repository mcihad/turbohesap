import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { UserSetting } from './entities/user-setting.entity'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'

// Settings — generic per-user key/value store (UI prefs, data-grid state) with a
// read-through/write-through cache. Served under /api/settings.
@Module({
  imports: [TypeOrmModule.forFeature([UserSetting])],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
