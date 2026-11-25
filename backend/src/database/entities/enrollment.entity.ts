import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { EnrollmentStatus } from '../domain';
import { User } from './user.entity';
import { Subject } from './subject.entity';
import { Grade } from './grade.entity';

@Entity('enrollments')
@Index(
  'uq_enrollment_term',
  ['studentId', 'subjectId', 'semester', 'schoolYear'],
  { unique: true },
)
@Index('idx_enrollments_subject', ['subjectId'])
export class Enrollment {
  @PrimaryGeneratedColumn({ name: 'enrollment_id', type: 'int' })
  enrollmentId: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ name: 'subject_id', type: 'int' })
  subjectId: number;

  @Column({ name: 'semester', type: 'varchar', length: 20 })
  semester: string;

  @Column({ name: 'school_year', type: 'varchar', length: 9 })
  schoolYear: string;

  @Column({ name: 'date_enrolled', type: 'date' })
  dateEnrolled: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'Enrolled' })
  status: EnrollmentStatus;

  @ManyToOne(() => User, (row) => row.enrollments, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'student_id',
    foreignKeyConstraintName: 'fk_enrollments_student_id',
  })
  student: Relation<User>;

  @ManyToOne(() => Subject, (row) => row.enrollments, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'subject_id',
    foreignKeyConstraintName: 'fk_enrollments_subject_id',
  })
  subject: Relation<Subject>;

  @OneToMany(() => Grade, (row) => row.enrollment)
  grades: Relation<Grade[]>;
}
