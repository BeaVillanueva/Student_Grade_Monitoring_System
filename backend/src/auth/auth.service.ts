import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { compare, hashSync } from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { User } from '../database/entities';
import { ROLES } from '../database/domain';
import { LoginDto } from './dto/login.dto';
import { publicUser } from './auth.types';

@Injectable()
export class AuthService {
  // Unknown users still perform bcrypt verification to reduce timing differences.
  private readonly dummyHash = hashSync(randomBytes(32).toString('hex'), 12);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(input: LoginDto) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: input.email })
      .getOne();
    const matches = await compare(
      input.password,
      user?.passwordHash ?? this.dummyHash,
    );
    if (
      !user ||
      !matches ||
      user.accountStatus !== 'Active' ||
      !ROLES.includes(user.role)
    ) {
      throw new UnauthorizedException('Authentication failed');
    }
    const accessToken = await this.jwt.signAsync(
      { role: user.role },
      { subject: String(user.userId) },
    );
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 1800,
      user: publicUser(user),
    };
  }

  async currentUser(userId: number) {
    const user = await this.users.findOneBy({ userId });
    if (
      !user ||
      user.accountStatus !== 'Active' ||
      !ROLES.includes(user.role)
    ) {
      throw new UnauthorizedException('Authentication failed');
    }
    return publicUser(user);
  }
}
