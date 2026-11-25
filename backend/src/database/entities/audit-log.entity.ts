import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
@Index('idx_audit_user_time', ['userId', 'actionTimestamp'])
@Index('idx_audit_record', ['tableAffected', 'recordId'])
export class AuditLog {
  @PrimaryGeneratedColumn({ name: 'audit_id', type: 'int' })
  auditId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'action', type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'table_affected', type: 'varchar', length: 50 })
  tableAffected: string;

  @Column({ name: 'record_id', type: 'int', nullable: true })
  recordId: number | null;

  @CreateDateColumn({
    name: 'action_timestamp',
    type: 'datetime',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP',
  })
  actionTimestamp: Date;

  @ManyToOne(() => User, (row) => row.auditLogs, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_audit_logs_user_id',
  })
  user: Relation<User>;
}
