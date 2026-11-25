import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AuditLog } from '../database/entities';

export interface AuditEntry {
  userId: number;
  action: string;
  tableAffected: string;
  recordId: number;
}

@Injectable()
export class AuditLogsService {
  async record(manager: EntityManager, entry: AuditEntry): Promise<void> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error(
        'Audit writes require the business operation transaction.',
      );
    }
    // The caller must supply its transaction manager; never open a separate connection.
    await manager.insert(AuditLog, {
      userId: entry.userId,
      action: entry.action,
      tableAffected: entry.tableAffected,
      recordId: entry.recordId,
    });
  }
}
