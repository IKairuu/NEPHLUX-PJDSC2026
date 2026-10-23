import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ModelVersion } from '../generated/prisma/client';
import { ModelVersionsRepository } from './model-versions.repository';

@Injectable()
export class ModelVersionsService {
  constructor(private readonly repository: ModelVersionsRepository) {}

  async findActive(): Promise<ModelVersion[]> {
    const rows = await this.repository.findActive();
    if (!rows.length) {
      throw new ServiceUnavailableException(
        'No active model. Run the database seed first.',
      );
    }
    return rows;
  }
}
