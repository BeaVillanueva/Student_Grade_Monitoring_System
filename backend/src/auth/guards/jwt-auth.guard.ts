import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import type { AuthenticatedRequest } from '../auth.types';
import { PUBLIC_ROUTE } from '../decorators/public.decorator';
import { ROLES } from '../../database/domain';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const match =
      typeof header === 'string' ? /^Bearer ([^\s]+)$/i.exec(header) : null;
    if (!match || match[1].length > 4096)
      throw new UnauthorizedException('Authentication failed');
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwt.verifyAsync<Record<string, unknown>>(match[1]);
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
    const id =
      typeof payload.sub === 'string' && /^[1-9]\d*$/.test(payload.sub)
        ? Number(payload.sub)
        : NaN;
    if (
      !Number.isSafeInteger(id) ||
      id > 2147483647 ||
      typeof payload.exp !== 'number' ||
      typeof payload.iat !== 'number' ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > 1800 ||
      !ROLES.some((role) => role === payload.role)
    ) {
      throw new UnauthorizedException('Authentication failed');
    }
    // Use the CURRENT database role/status, never the stale role claim for access decisions.
    request.user = await this.auth.currentUser(id);
    return true;
  }
}
