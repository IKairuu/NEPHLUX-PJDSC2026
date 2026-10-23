import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ClinicsService } from './clinics.service';
import { ClinicQueryDto } from './dto/clinic-query.dto';
import { ClinicResponseDto } from './dto/clinic-response.dto';

// Public reference data: the 42 YAKAP clinics (map pins, clinic pickers).
// The list comes from the seed, so there are no write routes.
@Public()
@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get()
  async findAll(@Query() query: ClinicQueryDto): Promise<ClinicResponseDto[]> {
    return (await this.clinicsService.findAll(query)).map((c) =>
      ClinicResponseDto.fromModel(c),
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClinicResponseDto> {
    return ClinicResponseDto.fromModel(await this.clinicsService.findOne(id));
  }
}
