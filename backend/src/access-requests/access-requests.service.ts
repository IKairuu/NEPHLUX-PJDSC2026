import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import {
  AccessRequestRow,
  AccessRequestsRepository,
  NewAccessRequest,
} from './access-requests.repository';
import { AccessRequestQueryDto } from './dto/access-request-query.dto';
import {
  AccessRequestCreatedDto,
  AccessRequestPageDto,
  AccessRequestResponseDto,
} from './dto/access-request-response.dto';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { UpdateAccessRequestDto } from './dto/update-access-request.dto';

const CHO_UNIT_TEXT: Record<string, string> = {
  NCD: 'Non-communicable disease',
  EPIDEMIOLOGY: 'Epidemiology',
  PLANNING: 'Planning',
};

@Injectable()
export class AccessRequestsService {
  constructor(
    private readonly repository: AccessRequestsRepository,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateAccessRequestDto): Promise<AccessRequestCreatedDto> {
    const email = dto.email.toLowerCase();
    if (await this.repository.staffEmailExists(email)) {
      throw new ConflictException(
        'An account with this email already exists. Sign in instead.',
      );
    }
    if (await this.repository.pendingEmailExists(email)) {
      throw new ConflictException(
        'A request for this email is already waiting for review',
      );
    }

    // keep only the fields that belong to the chosen role
    const data: NewAccessRequest = {
      fullName: dto.fullName.replace(/\s+/g, ' '),
      email,
      role: dto.role,
      prcLicenseNo: null,
      clinicId: null,
      barangayId: null,
      choUnit: null,
    };
    if (dto.role === 'DOCTOR') {
      const clinic = await this.repository.findClinicByRef(
        dto.clinicRef!.toUpperCase(),
      );
      if (!clinic) throw new BadRequestException('Unknown clinic');
      data.prcLicenseNo = dto.prcLicenseNo!;
      data.clinicId = clinic.id;
    } else if (dto.role === 'BHW') {
      const barangay = await this.repository.findBarangay(dto.barangayId!);
      if (!barangay) throw new BadRequestException('Unknown barangay');
      data.barangayId = barangay.id;
    } else {
      data.choUnit = dto.choUnit!;
    }

    const saved = await this.repository.create(data);
    // not awaited: a slow or failing mail server must not hold up the requester
    void this.mail.notifyTeam({
      subject: `NEPHLUX access request: ${saved.role} - ${saved.fullName}`,
      text: this.mailBody(saved),
      replyTo: saved.email,
    });
    return { id: saved.id, status: saved.status };
  }

  async findAll(query: AccessRequestQueryDto): Promise<AccessRequestPageDto> {
    const { rows, total } = await this.repository.findMany(
      query.status,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return {
      data: rows.map((r) => AccessRequestResponseDto.fromModel(r)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  async update(
    id: string,
    dto: UpdateAccessRequestDto,
    userId: string,
  ): Promise<AccessRequestResponseDto> {
    if (!(await this.repository.findById(id))) {
      throw new NotFoundException('Access request not found');
    }
    return AccessRequestResponseDto.fromModel(
      await this.repository.updateStatus(id, dto.status, userId),
    );
  }

  private mailBody(r: AccessRequestRow): string {
    const lines = [
      'A new NEPHLUX access request came in.',
      '',
      `Name:      ${r.fullName}`,
      `Email:     ${r.email}`,
      `Role:      ${r.role}`,
    ];
    if (r.role === 'DOCTOR') {
      lines.push(`PRC no.:   ${r.prcLicenseNo}`);
      lines.push(`Clinic:    ${r.clinic?.yakapRef} ${r.clinic?.name}`);
      lines.push(`Clinic id: ${r.clinic?.id}`);
    }
    if (r.role === 'BHW') {
      lines.push(`Barangay:  ${r.barangay?.name} (id ${r.barangay?.id})`);
    }
    if (r.role === 'CHO' && r.choUnit) {
      lines.push(`CHO unit:  ${CHO_UNIT_TEXT[r.choUnit]} (${r.choUnit})`);
    }
    lines.push(
      `Request:   ${r.id}`,
      `Sent:      ${r.createdAt.toISOString()}`,
      '',
      'To approve: check the details (for doctors, verify the PRC number),',
      'create the staff_users row with status ACTIVE, then mark this request',
      'APPROVED. Reply to this email to answer the requester directly.',
    );
    return lines.join('\n');
  }
}
