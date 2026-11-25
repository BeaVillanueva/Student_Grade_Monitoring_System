import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '../database/entities';
@Injectable()
export class UsersPolicyService {
  async lockActiveAdmins(manager: EntityManager): Promise<User[]> {
    // Current locking read serializes account-policy decisions, including promotions.
    return manager.find(User, {
      where: { role: 'Admin', accountStatus: 'Active' },
      order: { userId: 'ASC' },
      select: { userId: true, role: true, accountStatus: true },
      lock: { mode: 'pessimistic_write' },
    });
  }
}
