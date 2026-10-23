import { StaffRole } from '../generated/prisma/client';

// The signed-in staff member, attached to the request by JwtAuthGuard
export interface AuthUser {
  id: string;
  email: string;
  role: StaffRole;
  clinicId: string | null;
  barangayId: number | null;
}

export interface JwtPayload {
  sub: string;
  role: StaffRole;
}
