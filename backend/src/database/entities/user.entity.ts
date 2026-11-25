import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { UserRole, AccountStatus } from '../domain';
import { Subject } from './subject.entity';
import { Enrollment } from './enrollment.entity';
import { GradeInquiry } from './grade-inquiry.entity';
import { AuditLog } from './audit-log.entity';

@Entity('users')
@Index('uq_users_email', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'first_name', type: 'varchar', length: 50 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 50 })
  lastName: string;

  @Column({ name: 'email', type: 'varchar', length: 100 })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash: string;

  @Column({ name: 'role', type: 'varchar', length: 20 })
  role: UserRole;

  @Column({
    name: 'account_status',
    type: 'varchar',
    length: 20,
    default: 'Active',
  })
  accountStatus: AccountStatus;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @OneToMany(() => Subject, (row) => row.faculty)
  subjects: Relation<Subject[]>;

  @OneToMany(() => Enrollment, (row) => row.student)
  enrollments: Relation<Enrollment[]>;

  @OneToMany(() => GradeInquiry, (row) => row.student)
  inquiries: Relation<GradeInquiry[]>;

  @OneToMany(() => GradeInquiry, (row) => row.resolver)
  resolvedInquiries: Relation<GradeInquiry[]>;

  @OneToMany(() => AuditLog, (row) => row.user)
  auditLogs: Relation<AuditLog[]>;
}
