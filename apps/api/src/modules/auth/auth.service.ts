import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_CATEGORIES } from './default-categories';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const PUBLIC_USER = { id: true, email: true, name: true, avatar: true, createdAt: true } as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await argon2.hash(dto.password);
    // Nested create = one atomic write: the user never exists without their default categories.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        categories: { create: DEFAULT_CATEGORIES },
      },
      select: PUBLIC_USER,
    });
    return { accessToken: await this.sign(user.id, user.email), user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Same message for "no such user" and "wrong password" -> no account enumeration.
    const valid = user ? await argon2.verify(user.passwordHash, dto.password) : false;
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');

    return {
      accessToken: await this.sign(user.id, user.email),
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, createdAt: user.createdAt },
    };
  }

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: PUBLIC_USER });
  }

  private sign(sub: string, email: string): Promise<string> {
    return this.jwt.signAsync({ sub, email });
  }
}
