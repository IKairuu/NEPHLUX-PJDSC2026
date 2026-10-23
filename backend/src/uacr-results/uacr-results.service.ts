import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CreateUacrResultDto } from './dto/create-uacr-result.dto';
import {
  AssessmentForUacr,
  UacrResultsRepository,
  UacrResultWithRecorder,
} from './uacr-results.repository';

@Injectable()
export class UacrResultsService {
  constructor(private readonly repository: UacrResultsRepository) {}

  async create(
    dto: CreateUacrResultDto,
    user: AuthUser,
  ): Promise<UacrResultWithRecorder> {
    const a = await this.loadInScope(dto.assessmentId, user);
    if (!a.decision || a.decision.decision === 'NO_REFERRAL') {
      throw new BadRequestException(
        'There is no uACR referral for this assessment',
      );
    }
    return this.repository.create({
      assessmentId: a.id,
      valueMgG: dto.valueMgG,
      recordedById: user.id,
      isRepeat: dto.isRepeat ?? a._count.uacrResults > 0,
    });
  }

  async findByAssessment(
    assessmentId: string,
    user: AuthUser,
  ): Promise<UacrResultWithRecorder[]> {
    await this.loadInScope(assessmentId, user);
    return this.repository.findByAssessment(assessmentId);
  }

  // BHW: patients in their barangay. Doctor: their clinic's assessments. ADMIN: all.
  private async loadInScope(
    id: string,
    user: AuthUser,
  ): Promise<AssessmentForUacr> {
    const a = await this.repository.findAssessment(id);
    const allowed =
      !!a &&
      (user.role === 'ADMIN' ||
        (user.role === 'BHW' && a.patient.barangayId === user.barangayId) ||
        (user.role === 'DOCTOR' && a.clinicId === user.clinicId));
    if (!allowed) throw new NotFoundException(`Assessment ${id} not found`);
    return a;
  }
}
