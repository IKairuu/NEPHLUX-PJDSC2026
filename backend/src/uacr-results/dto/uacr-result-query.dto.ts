import { IsUUID } from 'class-validator';

export class UacrResultQueryDto {
  @IsUUID()
  assessmentId: string;
}
