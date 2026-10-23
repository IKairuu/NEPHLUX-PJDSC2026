import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { BarangaysService } from './barangays.service';
import { BarangayQueryDto } from './dto/barangay-query.dto';
import { BarangayResponseDto } from './dto/barangay-response.dto';

// Public reference data: the resident check needs the list without an account.
// POST/PATCH/DELETE (ADMIN only) come once the auth module and RolesGuard exist.
@Controller('barangays')
export class BarangaysController {
  constructor(private readonly barangaysService: BarangaysService) {}

  @Get()
  async findAll(
    @Query() query: BarangayQueryDto,
  ): Promise<BarangayResponseDto[]> {
    const rows = await this.barangaysService.findAll(query);
    return rows.map((b) =>
      BarangayResponseDto.fromModel(b, query.includeBoundary),
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: BarangayQueryDto,
  ): Promise<BarangayResponseDto> {
    const barangay = await this.barangaysService.findOne(
      id,
      query.includeBoundary,
    );
    return BarangayResponseDto.fromModel(barangay, query.includeBoundary);
  }
}
