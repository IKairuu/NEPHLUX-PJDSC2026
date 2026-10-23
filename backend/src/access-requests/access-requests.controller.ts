import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessRequestsService } from './access-requests.service';
import { AccessRequestQueryDto } from './dto/access-request-query.dto';
import {
  AccessRequestCreatedDto,
  AccessRequestPageDto,
  AccessRequestResponseDto,
} from './dto/access-request-response.dto';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { UpdateAccessRequestDto } from './dto/update-access-request.dto';

@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  // the public register page
  @Public()
  @Post()
  create(
    @Body() dto: CreateAccessRequestDto,
  ): Promise<AccessRequestCreatedDto> {
    return this.accessRequestsService.create(dto);
  }

  @Roles('ADMIN')
  @Get()
  findAll(
    @Query() query: AccessRequestQueryDto,
  ): Promise<AccessRequestPageDto> {
    return this.accessRequestsService.findAll(query);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccessRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AccessRequestResponseDto> {
    return this.accessRequestsService.update(id, dto, user.id);
  }
}
