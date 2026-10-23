import { StaffRole, StaffUser } from '../../generated/prisma/client';

// Never includes password_hash
export class StaffProfileDto {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  clinicId: string | null;
  barangayId: number | null;
  choUnit: string | null;

  static fromModel(u: StaffUser): StaffProfileDto {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      clinicId: u.clinicId,
      barangayId: u.barangayId,
      choUnit: u.choUnit,
    };
  }
}

export class AuthResponseDto {
  accessToken: string;
  expiresIn: string;
  user: StaffProfileDto;
}
