import { ConflictException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

export async function writeTransaction<T>(
  manager: EntityManager,
  work: (transaction: EntityManager) => Promise<T>,
): Promise<T> {
  try {
    return await manager.transaction(work);
  } catch (error) {
    const errno = (error as { driverError?: { errno?: number } })?.driverError
      ?.errno;
    if ([1062, 1451, 1213, 1205].includes(errno ?? 0))
      throw new ConflictException();
    throw error;
  }
}
