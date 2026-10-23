import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { StaffUser } from '../generated/prisma/client';
import { AuthRepository } from './auth.repository';
import { AuthUser, JwtPayload } from './auth-user';
import { AuthResponseDto, StaffProfileDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

export const JWT_EXPIRES_IN = '8h';

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
