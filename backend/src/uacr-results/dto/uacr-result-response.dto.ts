import { UacrResultWithRecorder } from '../uacr-results.repository';

const POSITIVE_MG_G = 30;

export class UacrResultResponseDto {
  id: string;
  assessmentId: string;
  valueMgG: number;
  isRepeat: boolean;
  recordedAt: Date;
  recordedBy: { id: string; fullName: string };
  suspectedAlbuminuria: boolean;
  message: string;

  static fromModel(u: UacrResultWithRecorder): UacrResultResponseDto {
    const positive = u.valueMgG >= POSITIVE_MG_G;
    return {
      id: u.id,
      assessmentId: u.assessmentId,
      valueMgG: u.valueMgG,
      isRepeat: u.isRepeat,
      recordedAt: u.recordedAt,
      recordedBy: u.recordedBy,
      suspectedAlbuminuria: positive,
      message: positive
        ? `uACR ${u.valueMgG} mg/g: suspected albuminuria. Repeat within 3 months; nephrologist if confirmed.`
        : `Result recorded: ${u.valueMgG} mg/g.`,
    };
  }
}
