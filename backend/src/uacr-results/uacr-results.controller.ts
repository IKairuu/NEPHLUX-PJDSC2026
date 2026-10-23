import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUacrResultDto } from './dto/create-uacr-result.dto';
import { UacrResultQueryDto } from './dto/uacr-result-query.dto';
import { UacrResultResponseDto } from './dto/uacr-result-response.dto';
import { UacrResultsService } from './uacr-results.service';

// uACR results come back from the lab; a BHW (at the door) or the doctor records them.
// Results are not edited or deleted: a wrong entry is followed by a repeat result.
@Roles('BHW', 'DOCTOR')
@Controller('uacr-results')
export class UacrResultsController {
  constructor(private readonly uacrResultsService: UacrResultsService) {}

  @Post()
  async create(
    @Body() dto: CreateUacrResultDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UacrResultResponseDto> {
    return UacrResultResponseDto.fromModel(
      await this.uacrResultsService.create(dto, user),
    );
  }

  @Get()
  async findAll(
    @Query() query: UacrResultQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UacrResultResponseDto[]> {
    return (
      await this.uacrResultsService.findByAssessment(query.assessmentId, user)
    ).map((u) => UacrResultResponseDto.fromModel(u));
  }
}
