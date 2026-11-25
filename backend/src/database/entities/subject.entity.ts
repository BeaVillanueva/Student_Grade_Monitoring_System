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
import { User } from './user.entity';
import { Enrollment } from './enrollment.entity';

@Entity('subjects')
@Index('uq_subjects_code', ['subjectCode'], { unique: true })
@Index('idx_subjects_faculty', ['facultyId'])
export class Subject {
  @PrimaryGeneratedColumn({ name: 'subject_id', type: 'int' })
  subjectId: number;

  @Column({ name: 'subject_code', type: 'varchar', length: 20 })
  subjectCode: string;

  @Column({ name: 'subject_name', type: 'varchar', length: 100 })
  subjectName: string;

  @Column({ name: 'units', type: 'int' })
  units: number;

  @Column({ name: 'faculty_id', type: 'int' })
  facultyId: number;

  @ManyToOne(() => User, (row) => row.subjects, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'faculty_id',
    foreignKeyConstraintName: 'fk_subjects_faculty_id',
  })
  faculty: Relation<User>;

  @OneToMany(() => Enrollment, (row) => row.subject)
  enrollments: Relation<Enrollment[]>;
}
