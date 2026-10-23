import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SettingResponseDto } from './dto/setting-response.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';

// The keys are fixed (uacr_price, missed_after_days, small_cell_min), so there is no POST or DELETE
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // any signed-in staff member
  @Get()
  findAll(): Promise<SettingResponseDto[]> {
    return this.settingsService.findAll();
  }

  @Roles('ADMIN')
  @Patch(':key')
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SettingResponseDto> {
    return this.settingsService.update(key, dto.value, user.id);
  }
}
