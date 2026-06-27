import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
} from '@nestjs/common'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { SetSettingDto } from './dto/set-setting.dto'
import { SettingsService } from './settings.service'

// Per-user settings — always scoped to the caller (no @RequirePermissions; any
// authenticated user manages only their own rows).
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get(':type')
  get(@Param('type') type: string, @CurrentUser() user: AuthUser): Promise<unknown | null> {
    return this.settings.get(user.sub, type)
  }

  @Put(':type')
  async set(
    @Param('type') type: string,
    @Body() dto: SetSettingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.settings.set(user.sub, type, dto.data)
  }

  @Delete(':type')
  @HttpCode(204)
  async remove(@Param('type') type: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.settings.remove(user.sub, type)
  }
}
