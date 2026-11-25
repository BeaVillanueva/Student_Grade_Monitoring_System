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
import type { InquiryStatus } from '../domain';
import { Grade } from './grade.entity';
import { User } from './user.entity';

@Entity('grade_inquiries')
@Index('idx_inquiries_grade', ['gradeId'])
@Index('idx_inquiries_student', ['studentId'])
@Index('idx_inquiries_resolver', ['resolvedBy'])
@Index('idx_inquiries_status', ['status'])
export class GradeInquiry {
  @PrimaryGeneratedColumn({ name: 'inquiry_id', type: 'int' })
  inquiryId: number;

  @Column({ name: 'grade_id', type: 'int' })
  gradeId: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'Pending' })
  status: InquiryStatus;

  @CreateDateColumn({
    name: 'date_submitted',
    type: 'datetime',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP',
  })
  dateSubmitted: Date;

  @Column({ name: 'resolved_by', type: 'int', nullable: true })
  resolvedBy: number | null;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string | null;

  @Column({
    name: 'date_resolved',
    type: 'datetime',
    precision: 0,
    nullable: true,
  })
  dateResolved: Date | null;

  @ManyToOne(() => Grade, (row) => row.inquiries, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'grade_id',
    foreignKeyConstraintName: 'fk_grade_inquiries_grade_id',
  })
  grade: Relation<Grade>;

  @ManyToOne(() => User, (row) => row.inquiries, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'student_id',
    foreignKeyConstraintName: 'fk_grade_inquiries_student_id',
  })
  student: Relation<User>;

  @ManyToOne(() => User, (row) => row.resolvedInquiries, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'resolved_by',
    foreignKeyConstraintName: 'fk_grade_inquiries_resolved_by',
  })
  resolver: Relation<User> | null;
}
