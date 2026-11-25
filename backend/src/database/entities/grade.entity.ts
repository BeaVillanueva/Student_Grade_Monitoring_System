import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { GradeType } from '../domain';
import { Enrollment } from './enrollment.entity';
import { GradeInquiry } from './grade-inquiry.entity';

@Entity('grades')
@Index('uq_grade_type', ['enrollmentId', 'gradeType'], { unique: true })
export class Grade {
  @PrimaryGeneratedColumn({ name: 'grade_id', type: 'int' })
  gradeId: number;

  @Column({ name: 'enrollment_id', type: 'int' })
  enrollmentId: number;

  @Column({ name: 'grade_type', type: 'varchar', length: 20 })
  gradeType: GradeType;

  @Column({ name: 'score', type: 'decimal', precision: 5, scale: 2 })
  score: string;

  @Column({ name: 'remarks', type: 'varchar', length: 30, nullable: true })
  remarks: string | null;

  @CreateDateColumn({
    name: 'date_recorded',
    type: 'datetime',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP',
  })
  dateRecorded: Date;

  @ManyToOne(() => Enrollment, (row) => row.grades, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'enrollment_id',
    foreignKeyConstraintName: 'fk_grades_enrollment_id',
  })
  enrollment: Relation<Enrollment>;

  @OneToMany(() => GradeInquiry, (row) => row.grade)
  inquiries: Relation<GradeInquiry[]>;
}
