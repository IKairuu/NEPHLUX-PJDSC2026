import { Controller, Get } from '@nestjs/common';
import { ModelVersionResponseDto } from './dto/model-version-response.dto';
import { ModelVersionsService } from './model-versions.service';

// Any signed-in staff member (Evidence screen). Models are loaded by the seed.
@Controller('model-versions')
export class ModelVersionsController {
  constructor(private readonly modelVersionsService: ModelVersionsService) {}

  @Get('active')
  async findActive(): Promise<ModelVersionResponseDto[]> {
    return (await this.modelVersionsService.findActive()).map((m) =>
      ModelVersionResponseDto.fromModel(m),
    );
  }
}
