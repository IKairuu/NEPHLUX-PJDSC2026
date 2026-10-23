import type {
  AccessRequestStatus,
  ChoUnit,
  StaffRole,
} from '../../generated/prisma/client';
import { PageMetaDto } from '../../common/dto/pagination-query.dto';
import type { AccessRequestRow } from '../access-requests.repository';

// What the public register page gets back
export class AccessRequestCreatedDto {
  id: string;
  status: AccessRequestStatus;
}

// What ADMIN sees when reviewing
export class AccessRequestResponseDto {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  prcLicenseNo: string | null;
  clinic: { id: string; yakapRef: string; name: string } | null;
  barangay: { id: number; name: string } | null;
  choUnit: ChoUnit | null;
  status: AccessRequestStatus;
  createdAt: Date;
  reviewedAt: Date | null;

  static fromModel(r: AccessRequestRow): AccessRequestResponseDto {
    return {
      id: r.id,
      fullName: r.fullName,
      email: r.email,
      role: r.role,
      prcLicenseNo: r.prcLicenseNo,
      clinic: r.clinic,
      barangay: r.barangay,
      choUnit: r.choUnit,
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
    };
  }
}

export class AccessRequestPageDto {
  data: AccessRequestResponseDto[];
  meta: PageMetaDto;
}
