import type { Request } from 'express';
import type { User } from '../database/entities';

export type AuthenticatedUser = Pick<
  User,
  | 'userId'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'role'
  | 'accountStatus'
  | 'createdAt'
>;
export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

export function publicUser(user: User): AuthenticatedUser {
  return {
    userId: user.userId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
  };
}
