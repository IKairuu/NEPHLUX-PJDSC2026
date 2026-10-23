import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { StaffUser } from '../generated/prisma/client';
import { AuthRepository } from './auth.repository';
import { AuthUser, JwtPayload } from './auth-user';
import { AuthResponseDto, StaffProfileDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export const JWT_EXPIRES_IN = '8h';
const PASSWORD_COST = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.repository.findStaffByEmail(
      dto.email.trim().toLowerCase(),
    );
    // same message for unknown email and wrong password
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is wrong');
    }
    this.assertActive(user);
    const updated = await this.repository.recordLogin(user.id);
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresIn: JWT_EXPIRES_IN,
      user: StaffProfileDto.fromModel(updated),
    };
  }

  async profile(id: string): Promise<StaffUser> {
    const user = await this.repository.findStaffById(id);
    if (!user) throw new UnauthorizedException('Account not found');
    return user;
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.profile(id);
    // 400, not 401, so the frontend does not treat it as a signed-out session
    if (!(await compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is wrong');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current one',
      );
    }
    await this.repository.updatePassword(
      id,
      await hash(dto.newPassword, PASSWORD_COST),
    );
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<StaffUser> {
    if (dto.fullName === undefined) return this.profile(id);
    return this.repository.updateProfile(id, { fullName: dto.fullName });
  }

  async activeUser(id: string): Promise<AuthUser> {
    const user = await this.profile(id);
    this.assertActive(user);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      barangayId: user.barangayId,
    };
  }

  private assertActive(user: StaffUser): void {
    if (user.status === 'PENDING') {
      throw new ForbiddenException('Your account is waiting for approval');
    }
    if (user.status === 'DISABLED') {
      throw new ForbiddenException('Your account is disabled');
    }
  }
}
