import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../database/domain';

export const REQUIRED_ROLES = 'sgms:roles';
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(REQUIRED_ROLES, roles);
